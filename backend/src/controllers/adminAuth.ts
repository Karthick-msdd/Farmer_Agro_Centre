import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { AdvancedOTPService } from '../services/advancedOTPService';

const prisma = new PrismaClient();

// Rate limiting for admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many admin login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login with OTP (SMS or TOTP)
export const adminLogin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, password, phone, otp, totpToken, backupCode } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find admin user by email or username
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: username }
        ],
        AND: [
          { isAdmin: true },
          { isActive: true }
        ]
      },
      include: {
        adminProfile: true
      }
    });

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check if account is locked
    if (adminUser.lockedUntil && adminUser.lockedUntil > new Date()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Verify password
    if (!adminUser.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordValid) {
      // Increment login attempts
      const loginAttempts = adminUser.loginAttempts + 1;
      const lockedUntil = loginAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // Lock for 30 minutes

      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          loginAttempts,
          lockedUntil
        }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check OTP preferences
    const otpPreferences = await AdvancedOTPService.getUserOTPPreferences(adminUser.id);
    
    // If TOTP is enabled and token/backup code provided
    if (otpPreferences?.totpEnabled && (totpToken || backupCode)) {
      let verificationResult;
      
      if (backupCode) {
        verificationResult = await AdvancedOTPService.verifyBackupCode(adminUser.id, backupCode);
      } else {
        verificationResult = await AdvancedOTPService.verifyTOTPCode(adminUser.id, totpToken);
      }
      
      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }
    }
    // If SMS OTP is provided
    else if (phone && otp) {
      const otpResult = await AdvancedOTPService.verifySMSOTP(phone, otp, 'ADMIN_LOGIN');
      
      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          message: otpResult.message
        });
      }
    }
    // If TOTP is enabled but no token provided, or SMS is preferred
    else if (otpPreferences?.totpEnabled && !totpToken && !backupCode) {
      return res.status(200).json({
        success: true,
        message: 'TOTP token required',
        requiresTOTP: true,
        preferredMethod: 'TOTP'
      });
    }
    // If SMS is preferred and no OTP provided
    else if (adminUser.phone && !otp) {
      const otpResult = await AdvancedOTPService.sendSMSOTP(adminUser.phone, 'ADMIN_LOGIN');
      
      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again.'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent to registered phone number',
        requiresOTP: true,
        preferredMethod: 'SMS',
        otp: otpResult.otp // Only shown in development
      });
    }
    // If no phone number registered
    else if (!adminUser.phone && !otpPreferences?.totpEnabled) {
      return res.status(400).json({
        success: false,
        message: 'No authentication method configured. Please contact system administrator.'
      });
    }

    // Reset login attempts on successful login
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: adminUser.id,
        role: adminUser.role,
        isAdmin: adminUser.isAdmin,
        adminLevel: adminUser.adminLevel,
        permissions: adminUser.adminProfile?.permissions || []
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    // Log admin login
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'ADMIN_LOGIN',
        resource: 'AUTH',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          isAdmin: adminUser.isAdmin,
          adminLevel: adminUser.adminLevel,
          permissions: adminUser.adminProfile?.permissions || [],
          department: adminUser.adminProfile?.department,
          designation: adminUser.adminProfile?.designation,
          lastLogin: adminUser.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Setup TOTP for admin
export const setupAdminTOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: username }
        ],
        AND: [
          { isAdmin: true },
          { isActive: true }
        ]
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    if (!adminUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Admin email not found'
      });
    }

    const result = await AdvancedOTPService.setupTOTP(adminUser.id, adminUser.email);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    // Generate QR code
    const qrCodeDataURL = await AdvancedOTPService.generateQRCode(result.data!.qrCodeUrl);

    return res.json({
      success: true,
      message: result.message,
      data: {
        totpSecret: result.data!.secret,
        qrCodeUrl: result.data!.qrCodeUrl,
        qrCodeDataURL,
        manualEntryKey: result.data!.manualEntryKey
      }
    });

  } catch (error) {
    console.error('Setup admin TOTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify admin TOTP setup
export const verifyAdminTOTPSetup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, token } = req.body;

    if (!username || !token) {
      return res.status(400).json({
        success: false,
        message: 'Username and TOTP token are required'
      });
    }

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: username }
        ],
        AND: [
          { isAdmin: true },
          { isActive: true }
        ]
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    const result = await AdvancedOTPService.verifyTOTPSetup(adminUser.id, token);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: {
        backupCodes: result.backupCodes
      }
    });

  } catch (error) {
    console.error('Verify admin TOTP setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Send OTP for admin login (SMS method)
export const sendAdminOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: username }
        ],
        AND: [
          { isAdmin: true },
          { isActive: true }
        ]
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    if (!adminUser.phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not registered for this admin account'
      });
    }

    // Send OTP
    const otpResult = await AdvancedOTPService.sendSMSOTP(adminUser.phone, 'ADMIN_LOGIN');
    
    if (!otpResult.success) {
      return res.status(500).json({
        success: false,
        message: otpResult.message
      });
    }

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      otp: otpResult.otp // Only shown in development
    });

  } catch (error) {
    console.error('Send admin OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify admin OTP (SMS method)
export const verifyAdminOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, phone, otp } = req.body;

    if (!username || !phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Username, phone, and OTP are required'
      });
    }

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: username }
        ],
        AND: [
          { isAdmin: true },
          { isActive: true },
          { phone: phone }
        ]
      },
      include: {
        adminProfile: true
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Verify OTP
    const otpResult = await AdvancedOTPService.verifySMSOTP(phone, otp, 'ADMIN_LOGIN');
    
    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    // Reset login attempts
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: adminUser.id,
        role: adminUser.role,
        isAdmin: adminUser.isAdmin,
        adminLevel: adminUser.adminLevel,
        permissions: adminUser.adminProfile?.permissions || []
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    // Log admin login
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'ADMIN_LOGIN_OTP',
        resource: 'AUTH',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return res.json({
      success: true,
      message: 'Admin OTP verified successfully',
      data: {
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          isAdmin: adminUser.isAdmin,
          adminLevel: adminUser.adminLevel,
          permissions: adminUser.adminProfile?.permissions || [],
          department: adminUser.adminProfile?.department,
          designation: adminUser.adminProfile?.designation,
          lastLogin: adminUser.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Verify admin OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create admin user (only for super admin)
export const createAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, password, role, department, designation, permissions, adminLevel } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { name }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or name already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        isAdmin: true,
        adminLevel: adminLevel || 1,
        isActive: true
      }
    });

    // Create admin profile
    const adminProfile = await prisma.adminProfile.create({
      data: {
        userId: adminUser.id,
        department: department || 'General',
        designation: designation || 'Admin',
        permissions: permissions || ['READ'],
        accessLevel: adminLevel || 1,
        isSuperAdmin: role === 'SUPER_ADMIN'
      }
    });

    // Log admin creation
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'CREATE_ADMIN',
        resource: 'USER',
        resourceId: adminUser.id,
        newData: { name, email, role, department, designation },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          isAdmin: adminUser.isAdmin,
          adminLevel: adminUser.adminLevel
        },
        profile: {
          department: adminProfile.department,
          designation: adminProfile.designation,
          permissions: adminProfile.permissions,
          accessLevel: adminProfile.accessLevel
        }
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all admin users
export const getAdminUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { page = 1, limit = 10, role, department } = req.query;

    const where: any = {
      isAdmin: true
    };

    if (role) {
      where.role = role;
    }

    if (department) {
      where.adminProfile = {
        department: department as string
      };
    }

    const adminUsers = await prisma.user.findMany({
      where,
      include: {
        adminProfile: true
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: {
        createdAt: 'desc'
      }
    });

    const total = await prisma.user.count({ where });

    return res.json({
      success: true,
      data: {
        users: adminUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          adminLevel: user.adminLevel,
          lastLogin: user.lastLogin,
          department: user.adminProfile?.department,
          designation: user.adminProfile?.designation,
          permissions: user.adminProfile?.permissions,
          createdAt: user.createdAt
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update admin user
export const updateAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { name, email, role, department, designation, permissions, adminLevel, isActive } = req.body;

    const adminUser = await prisma.user.findFirst({
      where: {
        id,
        isAdmin: true
      },
      include: {
        adminProfile: true
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name || adminUser.name,
        email: email || adminUser.email,
        role: role || adminUser.role,
        adminLevel: adminLevel || adminUser.adminLevel,
        isActive: isActive !== undefined ? isActive : adminUser.isActive
      }
    });

    // Update admin profile
    const updatedProfile = await prisma.adminProfile.update({
      where: { userId: id },
      data: {
        department: department || adminUser.adminProfile?.department,
        designation: designation || adminUser.adminProfile?.designation,
        permissions: permissions || adminUser.adminProfile?.permissions,
        accessLevel: adminLevel || adminUser.adminProfile?.accessLevel
      }
    });

    // Log admin update
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'UPDATE_ADMIN',
        resource: 'USER',
        resourceId: id,
        oldData: {
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          department: adminUser.adminProfile?.department,
          designation: adminUser.adminProfile?.designation
        },
        newData: {
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          department: updatedProfile.department,
          designation: updatedProfile.designation
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return res.json({
      success: true,
      message: 'Admin user updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          adminLevel: updatedUser.adminLevel
        },
        profile: {
          department: updatedProfile.department,
          designation: updatedProfile.designation,
          permissions: updatedProfile.permissions,
          accessLevel: updatedProfile.accessLevel
        }
      }
    });

  } catch (error) {
    console.error('Update admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete admin user
export const deleteAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const adminUser = await prisma.user.findFirst({
      where: {
        id,
        isAdmin: true
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Prevent self-deletion
    if (req.user?.userId === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete admin user (cascade will handle admin profile)
    await prisma.user.delete({
      where: { id }
    });

    // Log admin deletion
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'DELETE_ADMIN',
        resource: 'USER',
        resourceId: id,
        oldData: {
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return res.json({
      success: true,
      message: 'Admin user deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Change admin password
export const changeAdminPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const adminUser = await prisma.user.findFirst({
      where: {
        id: userId,
        isAdmin: true
      }
    });

    if (!adminUser || !adminUser.password) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminUser.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword
      }
    });

    // Log password change
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CHANGE_PASSWORD',
        resource: 'AUTH',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export { adminLoginLimiter };