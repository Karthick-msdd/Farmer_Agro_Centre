import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: string;
                isAdmin: boolean;
                adminLevel: number;
                permissions: string[];
            };
        }
    }
}
export declare const authenticateAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requirePermission: (permissions: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdminLevel: (minLevel: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireDepartment: (departments: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const auditLog: (action: string, resource: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=adminAuth.d.ts.map