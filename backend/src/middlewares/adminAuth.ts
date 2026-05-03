import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Request interface to include user
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

// Admin authentication middleware
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    // Check if user exists and is admin
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isAdmin: true,
        isActive: true
      },
      include: {
        adminProfile: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token or admin access denied.'
      });
      return;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
      return;
    }

    // Add user info to request
    req.user = {
      userId: user.id,
      role: user.role,
      isAdmin: user.isAdmin,
      adminLevel: user.adminLevel || 1,
      permissions: user.adminProfile?.permissions || []
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
    return;
  }
};

// Role-based access control middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Permission-based access control middleware
export const requirePermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Super admin has all permissions
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    // Check if user has required permissions
    const hasPermission = permissions.some(permission => 
      req.user?.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Admin level access control middleware
export const requireAdminLevel = (minLevel: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.adminLevel < minLevel) {
      res.status(403).json({
        success: false,
        message: 'Insufficient admin level'
      });
      return;
    }

    next();
  };
};

// Super admin only middleware
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Super admin access required'
    });
    return;
  }

  next();
};

// Department-based access control middleware
export const requireDepartment = (departments: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: req.user.userId },
        include: { adminProfile: true }
      });

      if (!user?.adminProfile?.department || !departments.includes(user.adminProfile.department)) {
        res.status(403).json({
          success: false,
          message: 'Department access denied'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Department check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return;
    }
  };
};

// Audit log middleware
export const auditLog = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Store original res.json
      const originalJson = res.json;

      // Override res.json to capture response
      res.json = function(body: any) {
        // Log the action
        if (req.user) {
          prisma.auditLog.create({
            data: {
              userId: req.user.userId,
              action,
              resource,
              resourceId: req.params.id ? String(req.params.id) : undefined,
              oldData: req.body.oldData,
              newData: req.body.newData || req.body,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          }).catch(console.error);
        }

        // Call original json method
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Audit log error:', error);
      next();
    }
  };
};
