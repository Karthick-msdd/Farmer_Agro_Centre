import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getSalesReport: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const getTopProducts: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const getLowStockItems: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const getOrderAnalytics: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=reports.d.ts.map