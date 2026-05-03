import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const registerUser: (req: Request, res: Response) => Promise<Response>;
export declare const loginUser: (req: Request, res: Response) => Promise<Response>;
export declare const refreshToken: (req: Request, res: Response) => Promise<Response>;
export declare const sendPhoneOTP: (req: Request, res: Response) => Promise<Response>;
export declare const verifyPhoneOTP: (req: Request, res: Response) => Promise<Response>;
export declare const setupTOTP: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const verifyTOTPSetup: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const loginWithTOTP: (req: Request, res: Response) => Promise<Response>;
export declare const getOTPPreferences: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const updateOTPPreferences: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const disableTOTP: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const resendOTP: (req: Request, res: Response) => Promise<Response>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const updateProfile: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=auth.d.ts.map