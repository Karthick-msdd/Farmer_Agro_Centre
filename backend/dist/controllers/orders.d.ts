import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getOrders: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const getOrderById: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const createOrder: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const updateOrderStatus: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const cancelOrder: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=orders.d.ts.map