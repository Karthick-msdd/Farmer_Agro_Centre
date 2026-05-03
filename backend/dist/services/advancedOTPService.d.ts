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
export declare class AdvancedOTPService {
    private static readonly OTP_EXPIRY_MINUTES;
    private static readonly MAX_ATTEMPTS;
    private static readonly OTP_LENGTH;
    private static readonly TOTP_WINDOW;
    private static readonly BACKUP_CODES_COUNT;
    static generateTOTPSecret(userId: string, userEmail: string): TOTPSecret;
    static generateQRCode(otpauthUrl: string): Promise<string>;
    static generateBackupCodes(): string[];
    static verifyTOTP(token: string, secret: string): boolean;
    static verifyHOTP(token: string, secret: string, counter: number): boolean;
    private static generateSMSOTP;
    private static sendSMS;
    private static storeOTPData;
    private static getOTPData;
    private static deleteOTPData;
    static setupTOTP(userId: string, userEmail: string): Promise<{
        success: boolean;
        data?: TOTPSecret;
        message: string;
    }>;
    static verifyTOTPSetup(userId: string, token: string): Promise<{
        success: boolean;
        message: string;
        backupCodes?: string[];
    }>;
    static sendSMSOTP(phone: string, type?: string): Promise<{
        success: boolean;
        message: string;
        otp?: string;
    }>;
    static verifySMSOTP(phone: string, otp: string, type?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static verifyTOTPCode(userId: string, token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static verifyBackupCode(userId: string, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static getUserOTPPreferences(userId: string): Promise<UserOTPPreferences | null>;
    static updateUserOTPPreferences(userId: string, preferences: Partial<UserOTPPreferences>): Promise<{
        success: boolean;
        message: string;
    }>;
    static disableTOTP(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=advancedOTPService.d.ts.map