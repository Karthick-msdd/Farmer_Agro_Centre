import { Request, Response } from 'express';
declare const adminLoginLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const adminLogin: (req: Request, res: Response) => Promise<Response>;
export declare const setupAdminTOTP: (req: Request, res: Response) => Promise<Response>;
export declare const verifyAdminTOTPSetup: (req: Request, res: Response) => Promise<Response>;
export declare const sendAdminOTP: (req: Request, res: Response) => Promise<Response>;
export declare const verifyAdminOTP: (req: Request, res: Response) => Promise<Response>;
export declare const createAdmin: (req: Request, res: Response) => Promise<Response>;
export declare const getAdminUsers: (req: Request, res: Response) => Promise<Response>;
export declare const updateAdmin: (req: Request, res: Response) => Promise<Response>;
export declare const deleteAdmin: (req: Request, res: Response) => Promise<Response>;
export declare const changeAdminPassword: (req: Request, res: Response) => Promise<Response>;
export { adminLoginLimiter };
//# sourceMappingURL=adminAuth.d.ts.map