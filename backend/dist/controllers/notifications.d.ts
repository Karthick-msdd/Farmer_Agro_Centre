import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getNotifications: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const markAsRead: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const markAllAsRead: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=notifications.d.ts.map