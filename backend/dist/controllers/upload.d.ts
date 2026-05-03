import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import multer from 'multer';
export declare const upload: multer.Multer;
export declare const uploadProfileImage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getProfileImage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteProfileImage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getUserProfile: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=upload.d.ts.map