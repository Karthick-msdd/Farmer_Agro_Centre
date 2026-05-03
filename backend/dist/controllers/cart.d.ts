import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getCart: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const addToCart: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const updateCartItem: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const removeFromCart: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const clearCart: (req: AuthRequest, res: Response) => Promise<Response>;
//# sourceMappingURL=cart.d.ts.map