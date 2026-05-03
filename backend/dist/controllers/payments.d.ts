import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const createPayment: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const verifyPayment: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const getPaymentStatus: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const createPaymentIntent: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const handlePaymentWebhook: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=payments.d.ts.map