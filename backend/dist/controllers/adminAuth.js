"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLoginLimiter = exports.changeAdminPassword = exports.deleteAdmin = exports.updateAdmin = exports.getAdminUsers = exports.createAdmin = exports.verifyAdminOTP = exports.sendAdminOTP = exports.verifyAdminTOTPSetup = exports.setupAdminTOTP = exports.adminLogin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const advancedOTPService_1 = require("../services/advancedOTPService");
const prisma = new client_1.PrismaClient();
const adminLoginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many admin login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
exports.adminLoginLimiter = adminLoginLimiter;
const adminLogin = async (req, res) => {
    try {
        const { username, password, phone, otp, totpToken, backupCode } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
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
        if (adminUser.lockedUntil && adminUser.lockedUntil > new Date()) {
            return res.status(423).json({
                success: false,
                message: 'Account is temporarily locked due to too many failed login attempts'
            });
        }
        if (!adminUser.password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, adminUser.password);
        if (!isPasswordValid) {
            const loginAttempts = adminUser.loginAttempts + 1;
            const lockedUntil = loginAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
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
        const otpPreferences = await advancedOTPService_1.AdvancedOTPService.getUserOTPPreferences(adminUser.id);
        if (otpPreferences?.totpEnabled && (totpToken || backupCode)) {
            let verificationResult;
            if (backupCode) {
                verificationResult = await advancedOTPService_1.AdvancedOTPService.verifyBackupCode(adminUser.id, backupCode);
            }
            else {
                verificationResult = await advancedOTPService_1.AdvancedOTPService.verifyTOTPCode(adminUser.id, totpToken);
            }
            if (!verificationResult.success) {
                return res.status(400).json({
                    success: false,
                    message: verificationResult.message
                });
            }
        }
        else if (phone && otp) {
            const otpResult = await advancedOTPService_1.AdvancedOTPService.verifySMSOTP(phone, otp, 'ADMIN_LOGIN');
            if (!otpResult.success) {
                return res.status(400).json({
                    success: false,
                    message: otpResult.message
                });
            }
        }
        else if (otpPreferences?.totpEnabled && !totpToken && !backupCode) {
            return res.status(200).json({
                success: true,
                message: 'TOTP token required',
                requiresTOTP: true,
                preferredMethod: 'TOTP'
            });
        }
        else if (adminUser.phone && !otp) {
            const otpResult = await advancedOTPService_1.AdvancedOTPService.sendSMSOTP(adminUser.phone, 'ADMIN_LOGIN');
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
                otp: otpResult.otp
            });
        }
        else if (!adminUser.phone && !otpPreferences?.totpEnabled) {
            return res.status(400).json({
                success: false,
                message: 'No authentication method configured. Please contact system administrator.'
            });
        }
        await prisma.user.update({
            where: { id: adminUser.id },
            data: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLogin: new Date()
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: adminUser.id,
            role: adminUser.role,
            isAdmin: adminUser.isAdmin,
            adminLevel: adminUser.adminLevel,
            permissions: adminUser.adminProfile?.permissions || []
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '8h' });
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
    }
    catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.adminLogin = adminLogin;
const setupAdminTOTP = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }
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
        const result = await advancedOTPService_1.AdvancedOTPService.setupTOTP(adminUser.id, adminUser.email);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message
            });
        }
        const qrCodeDataURL = await advancedOTPService_1.AdvancedOTPService.generateQRCode(result.data.qrCodeUrl);
        return res.json({
            success: true,
            message: result.message,
            data: {
                totpSecret: result.data.secret,
                qrCodeUrl: result.data.qrCodeUrl,
                qrCodeDataURL,
                manualEntryKey: result.data.manualEntryKey
            }
        });
    }
    catch (error) {
        console.error('Setup admin TOTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.setupAdminTOTP = setupAdminTOTP;
const verifyAdminTOTPSetup = async (req, res) => {
    try {
        const { username, token } = req.body;
        if (!username || !token) {
            return res.status(400).json({
                success: false,
                message: 'Username and TOTP token are required'
            });
        }
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
        const result = await advancedOTPService_1.AdvancedOTPService.verifyTOTPSetup(adminUser.id, token);
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
    }
    catch (error) {
        console.error('Verify admin TOTP setup error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.verifyAdminTOTPSetup = verifyAdminTOTPSetup;
const sendAdminOTP = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }
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
        const otpResult = await advancedOTPService_1.AdvancedOTPService.sendSMSOTP(adminUser.phone, 'ADMIN_LOGIN');
        if (!otpResult.success) {
            return res.status(500).json({
                success: false,
                message: otpResult.message
            });
        }
        return res.json({
            success: true,
            message: 'OTP sent successfully',
            otp: otpResult.otp
        });
    }
    catch (error) {
        console.error('Send admin OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.sendAdminOTP = sendAdminOTP;
const verifyAdminOTP = async (req, res) => {
    try {
        const { username, phone, otp } = req.body;
        if (!username || !phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Username, phone, and OTP are required'
            });
        }
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
        const otpResult = await advancedOTPService_1.AdvancedOTPService.verifySMSOTP(phone, otp, 'ADMIN_LOGIN');
        if (!otpResult.success) {
            return res.status(400).json({
                success: false,
                message: otpResult.message
            });
        }
        await prisma.user.update({
            where: { id: adminUser.id },
            data: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLogin: new Date()
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: adminUser.id,
            role: adminUser.role,
            isAdmin: adminUser.isAdmin,
            adminLevel: adminUser.adminLevel,
            permissions: adminUser.adminProfile?.permissions || []
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '8h' });
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
    }
    catch (error) {
        console.error('Verify admin OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.verifyAdminOTP = verifyAdminOTP;
const createAdmin = async (req, res) => {
    try {
        const { name, email, password, role, department, designation, permissions, adminLevel } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and role are required'
            });
        }
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
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const adminUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role,
                isAdmin: true,
                adminLevel: adminLevel || 1,
                isActive: true
            }
        });
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
    }
    catch (error) {
        console.error('Create admin error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.createAdmin = createAdmin;
const getAdminUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, department } = req.query;
        const where = {
            isAdmin: true
        };
        if (role) {
            where.role = role;
        }
        if (department) {
            where.adminProfile = {
                department: department
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
    }
    catch (error) {
        console.error('Get admin users error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getAdminUsers = getAdminUsers;
const updateAdmin = async (req, res) => {
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
        const updatedProfile = await prisma.adminProfile.update({
            where: { userId: id },
            data: {
                department: department || adminUser.adminProfile?.department,
                designation: designation || adminUser.adminProfile?.designation,
                permissions: permissions || adminUser.adminProfile?.permissions,
                accessLevel: adminLevel || adminUser.adminProfile?.accessLevel
            }
        });
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
    }
    catch (error) {
        console.error('Update admin error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.updateAdmin = updateAdmin;
const deleteAdmin = async (req, res) => {
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
        if (req.user?.userId === id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        await prisma.user.delete({
            where: { id }
        });
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
    }
    catch (error) {
        console.error('Delete admin error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.deleteAdmin = deleteAdmin;
const changeAdminPassword = async (req, res) => {
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
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, adminUser.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedNewPassword
            }
        });
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
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.changeAdminPassword = changeAdminPassword;
//# sourceMappingURL=adminAuth.js.map