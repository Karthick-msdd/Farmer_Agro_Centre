"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = exports.requireDepartment = exports.requireSuperAdmin = exports.requireAdminLevel = exports.requirePermission = exports.requireRole = exports.authenticateAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            res.status(423).json({
                success: false,
                message: 'Account is temporarily locked'
            });
            return;
        }
        req.user = {
            userId: user.id,
            role: user.role,
            isAdmin: user.isAdmin,
            adminLevel: user.adminLevel || 1,
            permissions: user.adminProfile?.permissions || []
        };
        next();
    }
    catch (error) {
        console.error('Admin authentication error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
        return;
    }
};
exports.authenticateAdmin = authenticateAdmin;
const requireRole = (roles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
const requirePermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        if (req.user.role === 'SUPER_ADMIN') {
            next();
            return;
        }
        const hasPermission = permissions.some(permission => req.user?.permissions.includes(permission));
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
exports.requirePermission = requirePermission;
const requireAdminLevel = (minLevel) => {
    return (req, res, next) => {
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
exports.requireAdminLevel = requireAdminLevel;
const requireSuperAdmin = (req, res, next) => {
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
exports.requireSuperAdmin = requireSuperAdmin;
const requireDepartment = (departments) => {
    return async (req, res, next) => {
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
        }
        catch (error) {
            console.error('Department check error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
            return;
        }
    };
};
exports.requireDepartment = requireDepartment;
const auditLog = (action, resource) => {
    return async (req, res, next) => {
        try {
            const originalJson = res.json;
            res.json = function (body) {
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
                return originalJson.call(this, body);
            };
            next();
        }
        catch (error) {
            console.error('Audit log error:', error);
            next();
        }
    };
};
exports.auditLog = auditLog;
//# sourceMappingURL=adminAuth.js.map