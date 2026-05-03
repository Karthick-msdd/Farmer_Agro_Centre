import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  adminLogin,
  sendAdminOTP,
  verifyAdminOTP,
  setupAdminTOTP,
  verifyAdminTOTPSetup,
  createAdmin,
  getAdminUsers,
  updateAdmin,
  deleteAdmin,
  changeAdminPassword,
  adminLoginLimiter
} from '../controllers/adminAuth';
import {
  authenticateAdmin,
  requireRole,
  requirePermission,
  requireAdminLevel,
  requireSuperAdmin,
  auditLog
} from '../middlewares/adminAuth';

const prisma = new PrismaClient();

const router = express.Router();

// Admin authentication routes
router.post('/login', adminLoginLimiter, adminLogin);
router.post('/otp/send', sendAdminOTP);
router.post('/otp/verify', verifyAdminOTP);
router.post('/totp/setup', setupAdminTOTP);
router.post('/totp/verify-setup', verifyAdminTOTPSetup);
router.post('/change-password', authenticateAdmin, changeAdminPassword);

// Admin management routes (Super Admin only)
router.post('/create', 
  authenticateAdmin, 
  requireSuperAdmin, 
  auditLog('CREATE_ADMIN', 'USER'),
  createAdmin
);

router.get('/users', 
  authenticateAdmin, 
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  getAdminUsers
);

router.put('/users/:id', 
  authenticateAdmin, 
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  auditLog('UPDATE_ADMIN', 'USER'),
  updateAdmin
);

router.delete('/users/:id', 
  authenticateAdmin, 
  requireSuperAdmin,
  auditLog('DELETE_ADMIN', 'USER'),
  deleteAdmin
);

// Role-specific routes
router.get('/agri-officers', 
  authenticateAdmin, 
  requireRole(['SUPER_ADMIN', 'ADMIN', 'AGRI_OFFICER']),
  (req, res) => {
    // Get agricultural officers
    res.json({ message: 'Agricultural officers data' });
  }
);

router.get('/market-analysts', 
  authenticateAdmin, 
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MARKET_ANALYST']),
  (req, res) => {
    // Get market analysts
    res.json({ message: 'Market analysts data' });
  }
);

router.get('/support-staff', 
  authenticateAdmin, 
  requireRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF']),
  (req, res) => {
    // Get support staff
    res.json({ message: 'Support staff data' });
  }
);

// Permission-based routes
router.get('/analytics', 
  authenticateAdmin, 
  requirePermission(['ANALYTICS_READ']),
  (req, res) => {
    // Analytics data
    res.json({ message: 'Analytics data' });
  }
);

router.get('/reports', 
  authenticateAdmin, 
  requirePermission(['REPORTS_READ']),
  (req, res) => {
    // Reports data
    res.json({ message: 'Reports data' });
  }
);

router.get('/user-management', 
  authenticateAdmin, 
  requirePermission(['USER_MANAGEMENT']),
  (req, res) => {
    // User management data
    res.json({ message: 'User management data' });
  }
);

router.get('/system-settings', 
  authenticateAdmin, 
  requirePermission(['SYSTEM_SETTINGS']),
  (req, res) => {
    // System settings data
    res.json({ message: 'System settings data' });
  }
);

// Admin level routes
router.get('/high-level-data', 
  authenticateAdmin, 
  requireAdminLevel(3),
  (req, res) => {
    // High-level admin data
    res.json({ message: 'High-level admin data' });
  }
);

router.get('/super-admin-data', 
  authenticateAdmin, 
  requireAdminLevel(5),
  (req, res) => {
    // Super admin only data
    res.json({ message: 'Super admin data' });
  }
);

// Audit logs
router.get('/audit-logs', 
  authenticateAdmin, 
  requirePermission(['AUDIT_LOGS']),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, action, resource, userId } = req.query;
      
      const where: any = {};
      if (action) where.action = action;
      if (resource) where.resource = resource;
      if (userId) where.userId = userId;

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
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Admin dashboard stats
router.get('/dashboard-stats', 
  authenticateAdmin, 
  async (req, res) => {
    try {
      const [
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue,
        recentUsers,
        recentOrders
      ] = await Promise.all([
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
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;
