"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedOTPService = void 0;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const redis_1 = require("../utils/redis");
const twilio_1 = __importDefault(require("twilio"));
let twilioClient = null;
const initializeTwilio = () => {
    if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_ACCOUNT_SID.startsWith('AC') && process.env.TWILIO_AUTH_TOKEN.length > 10) {
        try {
            twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }
        catch (error) {
            console.warn('Twilio initialization failed:', error);
        }
    }
};
class AdvancedOTPService {
    static generateTOTPSecret(userId, userEmail) {
        const secret = speakeasy_1.default.generateSecret({
            name: `Farming Agro Center (${userEmail})`,
            issuer: 'Farming Agro Center',
            length: 32
        });
        return {
            secret: secret.base32,
            qrCodeUrl: secret.otpauth_url,
            manualEntryKey: secret.base32
        };
    }
    static async generateQRCode(otpauthUrl) {
        try {
            const qrCodeDataURL = await qrcode_1.default.toDataURL(otpauthUrl);
            return qrCodeDataURL;
        }
        catch (error) {
            console.error('QR Code generation failed:', error);
            throw new Error('Failed to generate QR code');
        }
    }
    static generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            codes.push(code);
        }
        return codes;
    }
    static verifyTOTP(token, secret) {
        try {
            const verified = speakeasy_1.default.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: this.TOTP_WINDOW
            });
            return verified;
        }
        catch (error) {
            console.error('TOTP verification failed:', error);
            return false;
        }
    }
    static verifyHOTP(token, secret, counter) {
        try {
            const verified = speakeasy_1.default.hotp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                counter: counter
            });
            return verified;
        }
        catch (error) {
            console.error('HOTP verification failed:', error);
            return false;
        }
    }
    static generateSMSOTP() {
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
                case 'TOTP_SETUP':
                    message = `Your TOTP setup verification code for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
                    break;
                default:
                    message = `Your OTP for Agro Center is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
            }
            if (process.env.NODE_ENV === 'development' || !twilioClient) {
                console.log(`📱 SMS OTP for ${formattedPhone}: ${otp}`);
                return true;
            }
            initializeTwilio();
            if (twilioClient) {
                await twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: formattedPhone
                });
                console.log(`✅ SMS sent successfully to ${formattedPhone}`);
                return true;
            }
            else {
                console.log(`📱 SMS OTP for ${formattedPhone}: ${otp}`);
                return true;
            }
        }
        catch (error) {
            console.error('❌ SMS sending failed:', error);
            const fallbackFormatted = phone.startsWith('+91') ? phone : `+91${phone}`;
            console.log(`📱 SMS OTP for ${fallbackFormatted}: ${otp}`);
            return true;
        }
    }
    static async storeOTPData(key, data, expirySeconds) {
        try {
            const redis = (0, redis_1.getRedis)();
            await redis.setex(key, expirySeconds, JSON.stringify(data));
        }
        catch (error) {
            console.error('❌ Failed to store OTP data:', error);
            throw error;
        }
    }
    static async getOTPData(key) {
        try {
            const redis = (0, redis_1.getRedis)();
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            console.error('❌ Failed to get OTP data:', error);
            return null;
        }
    }
    static async deleteOTPData(key) {
        try {
            const redis = (0, redis_1.getRedis)();
            await redis.del(key);
        }
        catch (error) {
            console.error('❌ Failed to delete OTP data:', error);
        }
    }
    static async setupTOTP(userId, userEmail) {
        try {
            const totpSecret = this.generateTOTPSecret(userId, userEmail);
            const setupKey = `totp_setup:${userId}`;
            await this.storeOTPData(setupKey, {
                secret: totpSecret.secret,
                userId,
                userEmail,
                createdAt: new Date()
            }, 600);
            return {
                success: true,
                data: totpSecret,
                message: 'TOTP secret generated successfully'
            };
        }
        catch (error) {
            console.error('TOTP setup failed:', error);
            return {
                success: false,
                message: 'Failed to setup TOTP'
            };
        }
    }
    static async verifyTOTPSetup(userId, token) {
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
            const backupCodes = this.generateBackupCodes();
            const userKey = `user_otp:${userId}`;
            await this.storeOTPData(userKey, {
                userId,
                totpEnabled: true,
                totpSecret: setupData.secret,
                backupCodes,
                preferredMethod: 'TOTP',
                setupAt: new Date()
            }, 86400 * 30);
            await this.deleteOTPData(setupKey);
            return {
                success: true,
                message: 'TOTP setup completed successfully',
                backupCodes
            };
        }
        catch (error) {
            console.error('TOTP setup verification failed:', error);
            return {
                success: false,
                message: 'Failed to verify TOTP setup'
            };
        }
    }
    static async sendSMSOTP(phone, type = 'LOGIN') {
        try {
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return {
                    success: false,
                    message: 'Please enter a valid 10-digit mobile number'
                };
            }
            const rateLimitKey = `otp_rate_limit:${phone}`;
            const currentCount = await this.getOTPData(rateLimitKey);
            if (currentCount && parseInt(currentCount) >= 3) {
                return {
                    success: false,
                    message: 'Too many OTP requests. Please try again after 1 hour.'
                };
            }
            const otp = this.generateSMSOTP();
            const otpKey = `sms_otp:${phone}:${type}`;
            await this.storeOTPData(otpKey, {
                otp,
                phone,
                type,
                attempts: 0,
                expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000)
            }, this.OTP_EXPIRY_MINUTES * 60);
            const smsSent = await this.sendSMS(phone, otp, type);
            if (!smsSent) {
                await this.deleteOTPData(otpKey);
                return {
                    success: false,
                    message: 'Failed to send OTP. Please try again.'
                };
            }
            if (currentCount) {
                await this.storeOTPData(rateLimitKey, (parseInt(currentCount) + 1).toString(), 3600);
            }
            else {
                await this.storeOTPData(rateLimitKey, '1', 3600);
            }
            return {
                success: true,
                message: 'OTP sent successfully',
                otp: process.env.NODE_ENV === 'development' ? otp : undefined
            };
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Verify SMS OTP error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
    static async verifyTOTPCode(userId, token) {
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
        }
        catch (error) {
            console.error('Verify TOTP error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
    static async verifyBackupCode(userId, code) {
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
            userData.backupCodes.splice(codeIndex, 1);
            await this.storeOTPData(userKey, userData, 86400 * 30);
            return {
                success: true,
                message: 'Backup code verified successfully'
            };
        }
        catch (error) {
            console.error('Verify backup code error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
    static async getUserOTPPreferences(userId) {
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
        }
        catch (error) {
            console.error('Get user OTP preferences error:', error);
            return null;
        }
    }
    static async updateUserOTPPreferences(userId, preferences) {
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
        }
        catch (error) {
            console.error('Update user OTP preferences error:', error);
            return {
                success: false,
                message: 'Failed to update OTP preferences'
            };
        }
    }
    static async disableTOTP(userId) {
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
        }
        catch (error) {
            console.error('Disable TOTP error:', error);
            return {
                success: false,
                message: 'Failed to disable TOTP'
            };
        }
    }
}
exports.AdvancedOTPService = AdvancedOTPService;
AdvancedOTPService.OTP_EXPIRY_MINUTES = 5;
AdvancedOTPService.MAX_ATTEMPTS = 3;
AdvancedOTPService.OTP_LENGTH = 6;
AdvancedOTPService.TOTP_WINDOW = 2;
AdvancedOTPService.BACKUP_CODES_COUNT = 10;
//# sourceMappingURL=advancedOTPService.js.map