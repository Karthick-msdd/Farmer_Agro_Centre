"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const adminAuth_1 = require("../controllers/adminAuth");
const adminAuth_2 = require("../middlewares/adminAuth");
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
router.post('/login', adminAuth_1.adminLoginLimiter, adminAuth_1.adminLogin);
router.post('/otp/send', adminAuth_1.sendAdminOTP);
router.post('/otp/verify', adminAuth_1.verifyAdminOTP);
router.post('/totp/setup', adminAuth_1.setupAdminTOTP);
router.post('/totp/verify-setup', adminAuth_1.verifyAdminTOTPSetup);
router.post('/change-password', adminAuth_2.authenticateAdmin, adminAuth_1.changeAdminPassword);
router.post('/create', adminAuth_2.authenticateAdmin, adminAuth_2.requireSuperAdmin, (0, adminAuth_2.auditLog)('CREATE_ADMIN', 'USER'), adminAuth_1.createAdmin);
router.get('/users', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requireRole)(['SUPER_ADMIN', 'ADMIN']), adminAuth_1.getAdminUsers);
router.put('/users/:id', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requireRole)(['SUPER_ADMIN', 'ADMIN']), (0, adminAuth_2.auditLog)('UPDATE_ADMIN', 'USER'), adminAuth_1.updateAdmin);
router.delete('/users/:id', adminAuth_2.authenticateAdmin, adminAuth_2.requireSuperAdmin, (0, adminAuth_2.auditLog)('DELETE_ADMIN', 'USER'), adminAuth_1.deleteAdmin);
router.get('/agri-officers', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requireRole)(['SUPER_ADMIN', 'ADMIN', 'AGRI_OFFICER']), (req, res) => {
    res.json({ message: 'Agricultural officers data' });
});
router.get('/market-analysts', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requireRole)(['SUPER_ADMIN', 'ADMIN', 'MARKET_ANALYST']), (req, res) => {
    res.json({ message: 'Market analysts data' });
});
router.get('/support-staff', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF']), (req, res) => {
    res.json({ message: 'Support staff data' });
});
router.get('/analytics', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requirePermission)(['ANALYTICS_READ']), (req, res) => {
    res.json({ message: 'Analytics data' });
});
router.get('/reports', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requirePermission)(['REPORTS_READ']), (req, res) => {
    res.json({ message: 'Reports data' });
});
router.get('/user-management', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requirePermission)(['USER_MANAGEMENT']), (req, res) => {
    res.json({ message: 'User management data' });
});
router.get('/system-settings', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requirePermission)(['SYSTEM_SETTINGS']), (req, res) => {
    res.json({ message: 'System settings data' });
});
router.get('/high-level-data', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requireAdminLevel)(3), (req, res) => {
    res.json({ message: 'High-level admin data' });
});
router.get('/super-admin-data', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requireAdminLevel)(5), (req, res) => {
    res.json({ message: 'Super admin data' });
});
router.get('/audit-logs', adminAuth_2.authenticateAdmin, (0, adminAuth_2.requirePermission)(['AUDIT_LOGS']), async (req, res) => {
    try {
        const { page = 1, limit = 50, action, resource, userId } = req.query;
        const where = {};
        if (action)
            where.action = action;
        if (resource)
            where.resource = resource;
        if (userId)
            where.userId = userId;
        const auditLogs = await prisma.auditLog.findMany({
            where,
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { createdAt: 'desc' }
        });
        const total = await prisma.auditLog.count({ where });
        res.json({
            success: true,
            data: {
                logs: auditLogs,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.get('/dashboard-stats', adminAuth_2.authenticateAdmin, async (req, res) => {
    try {
        const [totalUsers, totalOrders, totalProducts, totalRevenue, recentUsers, recentOrders] = await Promise.all([
            prisma.user.count(),
            prisma.order.count(),
            prisma.product.count(),
            prisma.order.aggregate({
                _sum: { totalAmount: true }
            }),
            prisma.user.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                }
            }),
            prisma.order.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            })
        ]);
        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalOrders,
                    totalProducts,
                    totalRevenue: totalRevenue._sum.totalAmount || 0
                },
                recentUsers,
                recentOrders
            }
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map