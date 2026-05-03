import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getProducts: (req: Request, res: Response) => Promise<Response>;
export declare const getProductById: (req: Request, res: Response) => Promise<Response>;
export declare const createProduct: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const updateProduct: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const deleteProduct: (req: AuthRequest, res: Response) => Promise<Response>;
export declare const getProductsByCategory: (req: Request, res: Response) => Promise<Response>;
export declare const searchProducts: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=products.d.ts.map