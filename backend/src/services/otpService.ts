import { getRedis } from '../utils/redis';
import twilio from 'twilio';

// Twilio client for SMS
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface OTPData {
  otp: string;
  phone: string;
  expiresAt: Date;
  attempts: number;
  type: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET';
}

export class OTPService {
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly OTP_LENGTH = 6;

  /**
   * Generate a random OTP
   */
  private static generateOTP(): string {
    return Math.floor(Math.pow(10, this.OTP_LENGTH - 1) + Math.random() * Math.pow(10, this.OTP_LENGTH - 1)).toString();
  }

  /**
   * Send OTP via SMS using Twilio
   */
  private static async sendSMS(phone: string, otp: string, type: string): Promise<boolean> {
    try {
      // Format phone number for India (+91)
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
        case 'PASSWORD_RESET':
          message = `Your password reset OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
          break;
        default:
          message = `Your OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
      }

      // In development, just log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 SMS OTP for ${formattedPhone}: ${otp}`);
        return true;
      }

      // Send SMS via Twilio in production
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
      return true;

    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return false;
    }
  }

  /**
   * Store OTP in Redis
   */
  private static async storeOTP(phone: string, otp: string, type: string): Promise<void> {
    try {
      const redis = getRedis();
      const key = `otp:${phone}:${type}`;
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
      
      const otpData: OTPData = {
        otp,
        phone,
        expiresAt,
        attempts: 0,
        type: type as any
      };

      await redis.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(otpData));
      console.log(`✅ OTP stored for ${phone} (${type})`);
    } catch (error) {
      console.error('❌ Failed to store OTP:', error);
      throw error;
    }
  }

  /**
   * Get OTP from Redis
   */
  private static async getOTP(phone: string, type: string): Promise<OTPData | null> {
    try {
      const redis = getRedis();
      const key = `otp:${phone}:${type}`;
      const otpData = await redis.get(key);
      
      if (!otpData) {
        return null;
      }
      
      return JSON.parse(otpData) as OTPData;
    } catch (error) {
      console.error('❌ Failed to get OTP:', error);
      return null;
    }
  }

  /**
   * Delete OTP from Redis
   */
  private static async deleteOTP(phone: string, type: string): Promise<void> {
    try {
      const redis = getRedis();
      const key = `otp:${phone}:${type}`;
      await redis.del(key);
      console.log(`✅ OTP deleted for ${phone} (${type})`);
    } catch (error) {
      console.error('❌ Failed to delete OTP:', error);
    }
  }

  /**
   * Update OTP attempts
   */
  private static async updateOTPAttempts(phone: string, type: string, attempts: number): Promise<void> {
    try {
      const redis = getRedis();
      const key = `otp:${phone}:${type}`;
      const otpData = await redis.get(key);
      
      if (otpData) {
        const data = JSON.parse(otpData) as OTPData;
        data.attempts = attempts;
        await redis.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(data));
      }
    } catch (error) {
      console.error('❌ Failed to update OTP attempts:', error);
    }
  }

  /**
   * Send OTP to phone number
   */
  static async sendOTP(phone: string, type: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET' = 'LOGIN'): Promise<{ success: boolean; message: string; otp?: string }> {
    try {
      // Validate phone number format (Indian mobile numbers)
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return {
          success: false,
          message: 'Please enter a valid 10-digit mobile number'
        };
      }

      // Check if there's already a valid OTP for this phone
      const existingOTP = await this.getOTP(phone, type);
      if (existingOTP && new Date() < existingOTP.expiresAt) {
        return {
          success: false,
          message: `OTP already sent. Please wait ${Math.ceil((existingOTP.expiresAt.getTime() - Date.now()) / 1000)} seconds before requesting a new one.`
        };
      }

      // Generate new OTP
      const otp = this.generateOTP();
      
      // Store OTP in Redis
      await this.storeOTP(phone, otp, type);
      
      // Send SMS
      const smsSent = await this.sendSMS(phone, otp, type);
      
      if (!smsSent) {
        await this.deleteOTP(phone, type);
        return {
          success: false,
          message: 'Failed to send OTP. Please try again.'
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      };

    } catch (error) {
      console.error('❌ Send OTP error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(phone: string, otp: string, type: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET' = 'LOGIN'): Promise<{ success: boolean; message: string }> {
    try {
      // Get stored OTP
      const storedOTP = await this.getOTP(phone, type);
      
      if (!storedOTP) {
        return {
          success: false,
          message: 'OTP not found. Please request a new OTP.'
        };
      }
      
      // Check if OTP has expired
      if (new Date() > storedOTP.expiresAt) {
        await this.deleteOTP(phone, type);
        return {
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        };
      }
      
      // Check attempt limit
      if (storedOTP.attempts >= this.MAX_ATTEMPTS) {
        await this.deleteOTP(phone, type);
        return {
          success: false,
          message: 'Too many invalid attempts. Please request a new OTP.'
        };
      }
      
      // Verify OTP
      if (storedOTP.otp !== otp) {
        await this.updateOTPAttempts(phone, type, storedOTP.attempts + 1);
        return {
          success: false,
          message: 'Invalid OTP. Please try again.'
        };
      }
      
      // OTP is valid, delete it
      await this.deleteOTP(phone, type);
      
      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Resend OTP (with rate limiting)
   */
  static async resendOTP(phone: string, type: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET' = 'LOGIN'): Promise<{ success: boolean; message: string; otp?: string }> {
    try {
      // Check rate limiting (max 3 OTPs per phone per hour)
      const redis = getRedis();
      const rateLimitKey = `otp_rate_limit:${phone}`;
      const currentCount = await redis.get(rateLimitKey);
      
      if (currentCount && parseInt(currentCount) >= 3) {
        return {
          success: false,
          message: 'Too many OTP requests. Please try again after 1 hour.'
        };
      }
      
      // Increment rate limit counter
      if (currentCount) {
        await redis.incr(rateLimitKey);
      } else {
        await redis.setex(rateLimitKey, 3600, '1'); // 1 hour expiry
      }
      
      // Send new OTP
      return await this.sendOTP(phone, type);
      
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }
}

