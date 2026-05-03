"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const redis_1 = require("../utils/redis");
const twilio_1 = __importDefault(require("twilio"));
const twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
class OTPService {
    static generateOTP() {
        return Math.floor(Math.pow(10, this.OTP_LENGTH - 1) + Math.random() * Math.pow(10, this.OTP_LENGTH - 1)).toString();
    }
    static async sendSMS(phone, otp, type) {
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
                case 'PASSWORD_RESET':
                    message = `Your password reset OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
                    break;
                default:
                    message = `Your OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
            }
            if (process.env.NODE_ENV === 'development') {
                console.log(`📱 SMS OTP for ${formattedPhone}: ${otp}`);
                return true;
            }
            await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedPhone
            });
            console.log(`✅ SMS sent successfully to ${formattedPhone}`);
            return true;
        }
        catch (error) {
            console.error('❌ SMS sending failed:', error);
            return false;
        }
    }
    static async storeOTP(phone, otp, type) {
        try {
            const redis = (0, redis_1.getRedis)();
            const key = `otp:${phone}:${type}`;
            const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
            const otpData = {
                otp,
                phone,
                expiresAt,
                attempts: 0,
                type: type
            };
            await redis.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(otpData));
            console.log(`✅ OTP stored for ${phone} (${type})`);
        }
        catch (error) {
            console.error('❌ Failed to store OTP:', error);
            throw error;
        }
    }
    static async getOTP(phone, type) {
        try {
            const redis = (0, redis_1.getRedis)();
            const key = `otp:${phone}:${type}`;
            const otpData = await redis.get(key);
            if (!otpData) {
                return null;
            }
            return JSON.parse(otpData);
        }
        catch (error) {
            console.error('❌ Failed to get OTP:', error);
            return null;
        }
    }
    static async deleteOTP(phone, type) {
        try {
            const redis = (0, redis_1.getRedis)();
            const key = `otp:${phone}:${type}`;
            await redis.del(key);
            console.log(`✅ OTP deleted for ${phone} (${type})`);
        }
        catch (error) {
            console.error('❌ Failed to delete OTP:', error);
        }
    }
    static async updateOTPAttempts(phone, type, attempts) {
        try {
            const redis = (0, redis_1.getRedis)();
            const key = `otp:${phone}:${type}`;
            const otpData = await redis.get(key);
            if (otpData) {
                const data = JSON.parse(otpData);
                data.attempts = attempts;
                await redis.setex(key, this.OTP_EXPIRY_MINUTES * 60, JSON.stringify(data));
            }
        }
        catch (error) {
            console.error('❌ Failed to update OTP attempts:', error);
        }
    }
    static async sendOTP(phone, type = 'LOGIN') {
        try {
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return {
                    success: false,
                    message: 'Please enter a valid 10-digit mobile number'
                };
            }
            const existingOTP = await this.getOTP(phone, type);
            if (existingOTP && new Date() < existingOTP.expiresAt) {
                return {
                    success: false,
                    message: `OTP already sent. Please wait ${Math.ceil((existingOTP.expiresAt.getTime() - Date.now()) / 1000)} seconds before requesting a new one.`
                };
            }
            const otp = this.generateOTP();
            await this.storeOTP(phone, otp, type);
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
        }
        catch (error) {
            console.error('❌ Send OTP error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
    static async verifyOTP(phone, otp, type = 'LOGIN') {
        try {
            const storedOTP = await this.getOTP(phone, type);
            if (!storedOTP) {
                return {
                    success: false,
                    message: 'OTP not found. Please request a new OTP.'
                };
            }
            if (new Date() > storedOTP.expiresAt) {
                await this.deleteOTP(phone, type);
                return {
                    success: false,
                    message: 'OTP has expired. Please request a new OTP.'
                };
            }
            if (storedOTP.attempts >= this.MAX_ATTEMPTS) {
                await this.deleteOTP(phone, type);
                return {
                    success: false,
                    message: 'Too many invalid attempts. Please request a new OTP.'
                };
            }
            if (storedOTP.otp !== otp) {
                await this.updateOTPAttempts(phone, type, storedOTP.attempts + 1);
                return {
                    success: false,
                    message: 'Invalid OTP. Please try again.'
                };
            }
            await this.deleteOTP(phone, type);
            return {
                success: true,
                message: 'OTP verified successfully'
            };
        }
        catch (error) {
            console.error('❌ Verify OTP error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
    static async resendOTP(phone, type = 'LOGIN') {
        try {
            const redis = (0, redis_1.getRedis)();
            const rateLimitKey = `otp_rate_limit:${phone}`;
            const currentCount = await redis.get(rateLimitKey);
            if (currentCount && parseInt(currentCount) >= 3) {
                return {
                    success: false,
                    message: 'Too many OTP requests. Please try again after 1 hour.'
                };
            }
            if (currentCount) {
                await redis.incr(rateLimitKey);
            }
            else {
                await redis.setex(rateLimitKey, 3600, '1');
            }
            return await this.sendOTP(phone, type);
        }
        catch (error) {
            console.error('❌ Resend OTP error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
}
exports.OTPService = OTPService;
OTPService.OTP_EXPIRY_MINUTES = 5;
OTPService.MAX_ATTEMPTS = 3;
OTPService.OTP_LENGTH = 6;
//# sourceMappingURL=otpService.js.map