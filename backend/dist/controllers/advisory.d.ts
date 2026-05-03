import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getAdvisoryRequests: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const createAdvisoryRequest: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const updateAdvisoryRequest: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const replyToAdvisory: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=advisory.d.ts.map