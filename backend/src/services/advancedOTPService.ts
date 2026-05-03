import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getRedis } from '../utils/redis';
import twilio from 'twilio';

// Twilio client for SMS (only initialize if credentials are valid)
let twilioClient: any = null;

const initializeTwilio = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC') && process.env.TWILIO_AUTH_TOKEN.length > 10) {
    try {
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (error) {
      console.warn('Twilio initialization failed:', error);
    }
  }
};

export interface TOTPSecret {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface OTPVerificationResult {
  success: boolean;
  message: string;
  requiresSetup?: boolean;
  totpSecret?: TOTPSecret;
}

export interface UserOTPPreferences {
  userId: string;
  phone?: string;
  totpEnabled: boolean;
  totpSecret?: string;
  backupCodes?: string[];
  preferredMethod: 'SMS' | 'TOTP' | 'BOTH';
}

export class AdvancedOTPService {
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly OTP_LENGTH = 6;
  private static readonly TOTP_WINDOW = 2; // Allow 2 time steps (60 seconds) tolerance
  private static readonly BACKUP_CODES_COUNT = 10;

  /**
   * Generate TOTP secret for authenticator app setup
   */
  static generateTOTPSecret(userId: string, userEmail: string): TOTPSecret {
    const secret = speakeasy.generateSecret({
      name: `Farming Agro Center (${userEmail})`,
      issuer: 'Farming Agro Center',
      length: 32
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url!,
      manualEntryKey: secret.base32
    };
  }

  /**
   * Generate QR code for authenticator app setup
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate backup codes for account recovery
   */
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify TOTP code from authenticator app
   */
  static verifyTOTP(token: string, secret: string): boolean {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: this.TOTP_WINDOW
      });
      return verified;
    } catch (error) {
      console.error('TOTP verification failed:', error);
      return false;
    }
  }

  /**
   * Verify HOTP code (event-based)
   */
  static verifyHOTP(token: string, secret: string, counter: number): boolean {
    try {
      const verified = speakeasy.hotp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        counter: counter
      });
      return verified;
    } catch (error) {
      console.error('HOTP verification failed:', error);
      return false;
    }
  }

  /**
   * Generate SMS OTP (legacy method)
   */
  private static generateSMSOTP(): string {
    return Math.floor(Math.pow(10, this.OTP_LENGTH - 1) + Math.random() * Math.pow(10, this.OTP_LENGTH - 1)).toString();
  }

  /**
   * Send SMS OTP via Twilio
   */
  private static async sendSMS(phone: string, otp: string, type: string): Promise<boolean> {
    try {
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      
      let message = '';
      switch (type) {
        case 'LOGIN':
          message = `Your login OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
          break;
        case 'REGISTER':
          message = `Your registration OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
          break;
        case 'ADMIN_LOGIN':
          message = `Your admin login OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
          break;
        case 'TOTP_SETUP':
          message = `Your TOTP setup verification code for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
          break;
        default:
          message = `Your OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
      }

      // In development or when Twilio is not configured, just log the OTP
      if (process.env.NODE_ENV === 'development' || !twilioClient) {
        console.log(`📱 SMS OTP for ${formattedPhone}: ${otp}`);
        return true;
      }

      // Initialize Twilio if not already done
      initializeTwilio();

      // Send SMS via Twilio in production
      if (twilioClient) {
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });

        console.log(`✅ SMS sent successfully to ${formattedPhone}`);
        return true;
      } else {
        // Fallback to logging if Twilio is not available
        console.log(`📱 SMS OTP for ${formattedPhone}: ${otp}`);
        return true;
      }

    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      // Fallback to logging
      const fallbackFormatted = phone.startsWith('+91') ? phone : `+91${phone}`;
      console.log(`📱 SMS OTP for ${fallbackFormatted}: ${otp}`);
      return true;
    }
  }

  /**
   * Store OTP data in Redis
   */
  private static async storeOTPData(key: string, data: any, expirySeconds: number): Promise<void> {
    try {
      const redis = getRedis();
      await redis.setex(key, expirySeconds, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to store OTP data:', error);
      throw error;
    }
  }

  /**
   * Get OTP data from Redis
   */
  private static async getOTPData(key: string): Promise<any> {
    try {
      const redis = getRedis();
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Failed to get OTP data:', error);
      return null;
    }
  }

  /**
   * Delete OTP data from Redis
   */
  private static async deleteOTPData(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(key);
    } catch (error) {
      console.error('❌ Failed to delete OTP data:', error);
    }
  }

  /**
   * Setup TOTP for user (generate secret and QR code)
   */
  static async setupTOTP(userId: string, userEmail: string): Promise<{ success: boolean; data?: TOTPSecret; message: string }> {
    try {
      const totpSecret = this.generateTOTPSecret(userId, userEmail);
      
      // Store the secret temporarily for verification
      const setupKey = `totp_setup:${userId}`;
      await this.storeOTPData(setupKey, {
        secret: totpSecret.secret,
        userId,
        userEmail,
        createdAt: new Date()
      }, 600); // 10 minutes expiry

      return {
        success: true,
        data: totpSecret,
        message: 'TOTP secret generated successfully'
      };
    } catch (error) {
      console.error('TOTP setup failed:', error);
      return {
        success: false,
        message: 'Failed to setup TOTP'
      };
    }
  }

  /**
   * Verify TOTP setup (user enters code from authenticator app)
   */
  static async verifyTOTPSetup(userId: string, token: string): Promise<{ success: boolean; message: string; backupCodes?: string[] }> {
    try {
      const setupKey = `totp_setup:${userId}`;
      const setupData = await this.getOTPData(setupKey);
      
      if (!setupData) {
        return {
          success: false,
          message: 'TOTP setup session expired. Please start setup again.'
        };
      }

      const isValid = this.verifyTOTP(token, setupData.secret);
      
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid TOTP code. Please try again.'
        };
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Store user's TOTP preferences
      const userKey = `user_otp:${userId}`;
      await this.storeOTPData(userKey, {
        userId,
        totpEnabled: true,
        totpSecret: setupData.secret,
        backupCodes,
        preferredMethod: 'TOTP',
        setupAt: new Date()
      }, 86400 * 30); // 30 days

      // Clean up setup data
      await this.deleteOTPData(setupKey);

      return {
        success: true,
        message: 'TOTP setup completed successfully',
        backupCodes
      };
    } catch (error) {
      console.error('TOTP setup verification failed:', error);
      return {
        success: false,
        message: 'Failed to verify TOTP setup'
      };
    }
  }

  /**
   * Send OTP via SMS (fallback method)
   */
  static async sendSMSOTP(phone: string, type: string = 'LOGIN'): Promise<{ success: boolean; message: string; otp?: string }> {
    try {
      // Validate phone number format
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return {
          success: false,
          message: 'Please enter a valid 10-digit mobile number'
        };
      }

      // Check rate limiting
      const rateLimitKey = `otp_rate_limit:${phone}`;
      const currentCount = await this.getOTPData(rateLimitKey);
      
      if (currentCount && parseInt(currentCount) >= 3) {
        return {
          success: false,
          message: 'Too many OTP requests. Please try again after 1 hour.'
        };
      }

      // Generate and store OTP
      const otp = this.generateSMSOTP();
      const otpKey = `sms_otp:${phone}:${type}`;
      
      await this.storeOTPData(otpKey, {
        otp,
        phone,
        type,
        attempts: 0,
        expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000)
      }, this.OTP_EXPIRY_MINUTES * 60);

      // Send SMS
      const smsSent = await this.sendSMS(phone, otp, type);
      
      if (!smsSent) {
        await this.deleteOTPData(otpKey);
        return {
          success: false,
          message: 'Failed to send OTP. Please try again.'
        };
      }

      // Update rate limit
      if (currentCount) {
        await this.storeOTPData(rateLimitKey, (parseInt(currentCount) + 1).toString(), 3600);
      } else {
        await this.storeOTPData(rateLimitKey, '1', 3600);
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      };

    } catch (error) {
      console.error('Send SMS OTP error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Verify SMS OTP
   */
  static async verifySMSOTP(phone: string, otp: string, type: string = 'LOGIN'): Promise<{ success: boolean; message: string }> {
    try {
      const otpKey = `sms_otp:${phone}:${type}`;
      const otpData = await this.getOTPData(otpKey);
      
      if (!otpData) {
        return {
          success: false,
          message: 'OTP not found. Please request a new OTP.'
        };
      }
      
      if (new Date() > new Date(otpData.expiresAt)) {
        await this.deleteOTPData(otpKey);
        return {
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        };
      }
      
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        await this.deleteOTPData(otpKey);
        return {
          success: false,
          message: 'Too many invalid attempts. Please request a new OTP.'
        };
      }
      
      if (otpData.otp !== otp) {
        otpData.attempts++;
        await this.storeOTPData(otpKey, otpData, this.OTP_EXPIRY_MINUTES * 60);
        return {
          success: false,
          message: 'Invalid OTP. Please try again.'
        };
      }
      
      await this.deleteOTPData(otpKey);
      
      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('Verify SMS OTP error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Verify TOTP from authenticator app
   */
  static async verifyTOTPCode(userId: string, token: string): Promise<{ success: boolean; message: string }> {
    try {
      const userKey = `user_otp:${userId}`;
      const userData = await this.getOTPData(userKey);
      
      if (!userData || !userData.totpEnabled || !userData.totpSecret) {
        return {
          success: false,
          message: 'TOTP not enabled for this user'
        };
      }

      const isValid = this.verifyTOTP(token, userData.totpSecret);
      
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid TOTP code. Please try again.'
        };
      }

      return {
        success: true,
        message: 'TOTP verified successfully'
      };

    } catch (error) {
      console.error('Verify TOTP error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const userKey = `user_otp:${userId}`;
      const userData = await this.getOTPData(userKey);
      
      if (!userData || !userData.backupCodes) {
        return {
          success: false,
          message: 'No backup codes available'
        };
      }

      const codeIndex = userData.backupCodes.indexOf(code.toUpperCase());
      
      if (codeIndex === -1) {
        return {
          success: false,
          message: 'Invalid backup code'
        };
      }

      // Remove used backup code
      userData.backupCodes.splice(codeIndex, 1);
      await this.storeOTPData(userKey, userData, 86400 * 30);

      return {
        success: true,
        message: 'Backup code verified successfully'
      };

    } catch (error) {
      console.error('Verify backup code error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Get user OTP preferences
   */
  static async getUserOTPPreferences(userId: string): Promise<UserOTPPreferences | null> {
    try {
      const userKey = `user_otp:${userId}`;
      const userData = await this.getOTPData(userKey);
      
      if (!userData) {
        return null;
      }

      return {
        userId: userData.userId,
        totpEnabled: userData.totpEnabled || false,
        totpSecret: userData.totpSecret,
        backupCodes: userData.backupCodes,
        preferredMethod: userData.preferredMethod || 'SMS'
      };

    } catch (error) {
      console.error('Get user OTP preferences error:', error);
      return null;
    }
  }

  /**
   * Update user OTP preferences
   */
  static async updateUserOTPPreferences(userId: string, preferences: Partial<UserOTPPreferences>): Promise<{ success: boolean; message: string }> {
    try {
      const userKey = `user_otp:${userId}`;
      const userData = await this.getOTPData(userKey) || { userId };
      
      const updatedData = {
        ...userData,
        ...preferences,
        updatedAt: new Date()
      };

      await this.storeOTPData(userKey, updatedData, 86400 * 30);

      return {
        success: true,
        message: 'OTP preferences updated successfully'
      };

    } catch (error) {
      console.error('Update user OTP preferences error:', error);
      return {
        success: false,
        message: 'Failed to update OTP preferences'
      };
    }
  }

  /**
   * Disable TOTP for user
   */
  static async disableTOTP(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userKey = `user_otp:${userId}`;
      const userData = await this.getOTPData(userKey);
      
      if (!userData) {
        return {
          success: false,
          message: 'User OTP preferences not found'
        };
      }

      userData.totpEnabled = false;
      userData.totpSecret = undefined;
      userData.preferredMethod = 'SMS';
      userData.disabledAt = new Date();

      await this.storeOTPData(userKey, userData, 86400 * 30);

      return {
        success: true,
        message: 'TOTP disabled successfully'
      };

    } catch (error) {
      console.error('Disable TOTP error:', error);
      return {
        success: false,
        message: 'Failed to disable TOTP'
      };
    }
  }
}
