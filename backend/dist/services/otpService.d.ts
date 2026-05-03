export interface OTPData {
    otp: string;
    phone: string;
    expiresAt: Date;
    attempts: number;
    type: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET';
}
export declare class OTPService {
    private static readonly OTP_EXPIRY_MINUTES;
    private static readonly MAX_ATTEMPTS;
    private static readonly OTP_LENGTH;
    private static generateOTP;
    private static sendSMS;
    private static storeOTP;
    private static getOTP;
    private static deleteOTP;
    private static updateOTPAttempts;
    static sendOTP(phone: string, type?: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET'): Promise<{
        success: boolean;
        message: string;
        otp?: string;
    }>;
    static verifyOTP(phone: string, otp: string, type?: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET'): Promise<{
        success: boolean;
        message: string;
    }>;
    static resendOTP(phone: string, type?: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN' | 'PASSWORD_RESET'): Promise<{
        success: boolean;
        message: string;
        otp?: string;
    }>;
}
//# sourceMappingURL=otpService.d.ts.map