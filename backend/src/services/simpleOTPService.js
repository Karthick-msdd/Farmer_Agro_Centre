// Enhanced OTP Service with SMS Gateway Integration
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const Redis = require('ioredis');
const crypto = require('crypto');

// Redis client
let redis;

class InMemoryRedis {
  constructor() {
    this.store = new Map();
  }
  async setex(key, seconds, value) {
    const expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, { value, expiresAt });
  }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  async del(...keys) {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }
  async keys(pattern) {
    const esc = s => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('^' + esc(pattern).replace(/\\\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(k => re.test(k));
  }
  async ttl(key) {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const ttlMs = entry.expiresAt - Date.now();
    if (ttlMs <= 0) {
      this.store.delete(key);
      return -2;
    }
    return Math.floor(ttlMs / 1000);
  }
  async ping() { return 'PONG'; }
  on() {}
}

const connectToRedis = async () => {
  try {
    if (process.env.REDIS_DISABLED === 'true') {
      redis = new InMemoryRedis();
      console.warn('⚠️  Redis disabled via REDIS_DISABLED=true. Using in-memory store.');
      return;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redis.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    await redis.ping();
    console.log('✅ Redis ping successful');
    
  } catch (error) {
    console.error('❌ Redis connection error, falling back to in-memory store:', error);
    redis = new InMemoryRedis();
    console.warn('⚠️  Using in-memory Redis fallback. Do not use this in production.');
  }
};

const getRedis = () => {
  if (!redis) {
    throw new Error('Redis not connected. Call connectToRedis() first.');
  }
  return redis;
};

// OTP Service Class
class SimpleOTPService {
  static async sendSMSOTP(phone, type = 'LOGIN') {
    try {
      // Validate phone number
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return {
          success: false,
          message: 'Please enter a valid 10-digit mobile number'
        };
      }

      // Check rate limiting
      const rateLimitKey = `otp_rate_limit:${phone}`;
      const currentCount = await redis.get(rateLimitKey);
      
      if (currentCount && parseInt(currentCount) >= 5) {
        return {
          success: false,
          message: 'Too many OTP requests. Please try again after 15 minutes.'
        };
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpKey = `sms_otp:${phone}:${type}`;
      
      // Store OTP for 5 minutes
      await redis.setex(otpKey, 300, JSON.stringify({
        otp,
        phone,
        type,
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: false
      }));

      // SMS sending is disabled - using mock SMS only

      // Mock SMS sending (fallback)
      console.log(`📱 Mock SMS OTP for ${phone}: ${otp} (Type: ${type})`);

      // Update rate limit
      if (currentCount) {
        await redis.setex(rateLimitKey, 900, (parseInt(currentCount) + 1).toString());
      } else {
        await redis.setex(rateLimitKey, 900, '1');
      }

      return {
        success: true,
        message: 'OTP sent successfully (Mock SMS)',
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

  static async verifySMSOTP(phone, otp, type = 'LOGIN') {
    try {
      const otpKey = `sms_otp:${phone}:${type}`;
      const otpDataString = await redis.get(otpKey);
      
      if (!otpDataString) {
        return {
          success: false,
          message: 'OTP not found. Please request a new OTP.'
        };
      }
      
      const otpData = JSON.parse(otpDataString);
      
      if (new Date() > new Date(otpData.expiresAt)) {
        await redis.del(otpKey);
        return {
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        };
      }
      
      if (otpData.attempts >= 3) {
        await redis.del(otpKey);
        return {
          success: false,
          message: 'Too many invalid attempts. Please request a new OTP.'
        };
      }
      
      if (otpData.otp !== otp) {
        otpData.attempts++;
        await redis.setex(otpKey, 300, JSON.stringify(otpData));
        return {
          success: false,
          message: 'Invalid OTP. Please try again.'
        };
      }
      
      // OTP is valid, remove it
      await redis.del(otpKey);
      
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

  static generateTOTPSecret(userId, userEmail) {
    const secret = speakeasy.generateSecret({
      name: `Farming Agro Center (${userEmail})`,
      issuer: 'Farming Agro Center',
      length: 32,
      algorithm: 'sha256'
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      manualEntryKey: secret.base32,
      backupCodes: this.generateBackupCodes()
    };
  }

  // Generate backup codes for TOTP
  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  static async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyTOTP(token, secret, window = 2) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window,
        algorithm: 'sha256'
      });
      return verified;
    } catch (error) {
      console.error('TOTP verification failed:', error);
      return false;
    }
  }

  // Generate HOTP (Event-based OTP)
  static generateHOTP(secret, counter) {
    try {
      return speakeasy.hotp({
        secret,
        encoding: 'base32',
        counter,
        algorithm: 'sha256'
      });
    } catch (error) {
      console.error('HOTP generation error:', error);
      throw error;
    }
  }

  // Verify HOTP
  static verifyHOTP(secret, token, counter, window = 5) {
    try {
      return speakeasy.hotp.verify({
        secret,
        encoding: 'base32',
        token,
        counter,
        window,
        algorithm: 'sha256'
      });
    } catch (error) {
      console.error('HOTP verification error:', error);
      return false;
    }
  }

  // Clean up expired OTPs
  static async cleanupExpiredOTPs() {
    try {
      const keys = await redis.keys('sms_otp:*');
      const expiredKeys = [];

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // No expiration set
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await redis.del(...expiredKeys);
        console.log(`🧹 Cleaned up ${expiredKeys.length} expired OTPs`);
      }
    } catch (error) {
      console.error('Cleanup expired OTPs error:', error);
    }
  }
}

module.exports = {
  SimpleOTPService,
  connectToRedis,
  getRedis
};
