"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.resendOTP = exports.disableTOTP = exports.updateOTPPreferences = exports.getOTPPreferences = exports.loginWithTOTP = exports.verifyTOTPSetup = exports.setupTOTP = exports.verifyPhoneOTP = exports.sendPhoneOTP = exports.refreshToken = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const advancedOTPService_1 = require("../services/advancedOTPService");
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, role = 'FARMER', age, gender, address, village, district, state, farmSize, farmLocation, farmLatitude, farmLongitude, cropTypes, preferredLanguage } = req.body;
        if (!name || (!email && !phone)) {
            return res.status(400).json({ error: 'Name and either email or phone are required' });
        }
        const orExisting = [];
        if (email)
            orExisting.push({ email });
        if (phone)
            orExisting.push({ phone });
        const existingUser = await prisma_1.default.user.findFirst({
            where: {
                OR: orExisting
            }
        });
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email or phone already exists' });
        }
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcryptjs_1.default.hash(password, 12);
        }
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                role
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true
            }
        });
        if (role === 'FARMER') {
            await prisma_1.default.farmer.create({
                data: {
                    userId: user.id,
                    age: age ? parseInt(age) : null,
                    gender,
                    address,
                    village,
                    district,
                    state,
                    farmSize: farmSize ? parseFloat(farmSize) : null,
                    farmLocation,
                    farmLatitude: farmLatitude ? parseFloat(farmLatitude) : null,
                    farmLongitude: farmLongitude ? parseFloat(farmLongitude) : null,
                    cropTypes: cropTypes ? JSON.stringify(cropTypes) : null,
                    preferredLanguage: preferredLanguage || 'English'
                }
            });
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        return res.status(201).json({
            message: 'User registered successfully',
            user,
            tokens: {
                accessToken,
                refreshToken
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        if (!email && !phone) {
            return res.status(400).json({ error: 'Email or phone is required' });
        }
        const orLogin = [];
        if (email)
            orLogin.push({ email });
        if (phone)
            orLogin.push({ phone });
        const user = await prisma_1.default.user.findFirst({
            where: {
                OR: orLogin,
                isActive: true
            }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.password && password) {
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        else if (user.password && !password) {
            return res.status(401).json({ error: 'Password required' });
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        return res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            },
            tokens: {
                accessToken,
                refreshToken
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.loginUser = loginUser;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true, isActive: true }
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        const newAccessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.json({
            accessToken: newAccessToken
        });
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
};
exports.refreshToken = refreshToken;
const sendPhoneOTP = async (req, res) => {
    try {
        const { phone, type = 'LOGIN' } = req.body;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const result = await advancedOTPService_1.AdvancedOTPService.sendSMSOTP(phone, type);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({
            message: result.message,
            otp: result.otp
        });
    }
    catch (error) {
        console.error('Send OTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.sendPhoneOTP = sendPhoneOTP;
const verifyPhoneOTP = async (req, res) => {
    try {
        const { phone, otp, type = 'LOGIN', userData } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone number and OTP are required' });
        }
        const otpResult = await advancedOTPService_1.AdvancedOTPService.verifySMSOTP(phone, otp, type);
        if (!otpResult.success) {
            return res.status(400).json({ error: otpResult.message });
        }
        let user = await prisma_1.default.user.findUnique({
            where: { phone }
        });
        if (user) {
            const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key', { expiresIn: '7d' });
            await prisma_1.default.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });
            return res.json({
                message: 'Login successful',
                isNewUser: false,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            });
        }
        else {
            if (type === 'REGISTER' && userData) {
                const { name, role = 'FARMER', ...farmerData } = userData;
                const newUser = await prisma_1.default.user.create({
                    data: {
                        name: name || `User ${phone}`,
                        phone,
                        role
                    }
                });
                if (role === 'FARMER') {
                    await prisma_1.default.farmer.create({
                        data: {
                            userId: newUser.id,
                            ...farmerData
                        }
                    });
                }
                const accessToken = jsonwebtoken_1.default.sign({ userId: newUser.id, role: newUser.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
                const refreshToken = jsonwebtoken_1.default.sign({ userId: newUser.id }, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key', { expiresIn: '7d' });
                return res.json({
                    message: 'Registration successful',
                    isNewUser: true,
                    user: {
                        id: newUser.id,
                        name: newUser.name,
                        phone: newUser.phone,
                        role: newUser.role
                    },
                    tokens: {
                        accessToken,
                        refreshToken
                    }
                });
            }
            else {
                return res.json({
                    message: 'OTP verified successfully',
                    isNewUser: true,
                    phone,
                    requiresRegistration: true
                });
            }
        }
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyPhoneOTP = verifyPhoneOTP;
const setupTOTP = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true }
        });
        if (!user || !user.email) {
            return res.status(400).json({ error: 'User email not found' });
        }
        const result = await advancedOTPService_1.AdvancedOTPService.setupTOTP(userId, user.email);
        if (!result.success) {
            return res.status(500).json({ error: result.message });
        }
        const qrCodeDataURL = await advancedOTPService_1.AdvancedOTPService.generateQRCode(result.data.qrCodeUrl);
        return res.json({
            message: result.message,
            totpSecret: result.data.secret,
            qrCodeUrl: result.data.qrCodeUrl,
            qrCodeDataURL,
            manualEntryKey: result.data.manualEntryKey
        });
    }
    catch (error) {
        console.error('Setup TOTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.setupTOTP = setupTOTP;
const verifyTOTPSetup = async (req, res) => {
    try {
        const userId = req.user.id;
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'TOTP token is required' });
        }
        const result = await advancedOTPService_1.AdvancedOTPService.verifyTOTPSetup(userId, token);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({
            message: result.message,
            backupCodes: result.backupCodes
        });
    }
    catch (error) {
        console.error('Verify TOTP setup error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyTOTPSetup = verifyTOTPSetup;
const loginWithTOTP = async (req, res) => {
    try {
        const { phone, token, backupCode } = req.body;
        if (!phone || (!token && !backupCode)) {
            return res.status(400).json({ error: 'Phone number and TOTP token or backup code are required' });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { phone }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        let verificationResult;
        if (backupCode) {
            verificationResult = await advancedOTPService_1.AdvancedOTPService.verifyBackupCode(user.id, backupCode);
        }
        else {
            verificationResult = await advancedOTPService_1.AdvancedOTPService.verifyTOTPCode(user.id, token);
        }
        if (!verificationResult.success) {
            return res.status(400).json({ error: verificationResult.message });
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });
        return res.json({
            message: 'TOTP login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            },
            tokens: {
                accessToken,
                refreshToken
            }
        });
    }
    catch (error) {
        console.error('TOTP login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.loginWithTOTP = loginWithTOTP;
const getOTPPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const preferences = await advancedOTPService_1.AdvancedOTPService.getUserOTPPreferences(userId);
        return res.json({
            preferences: preferences || {
                userId,
                totpEnabled: false,
                preferredMethod: 'SMS'
            }
        });
    }
    catch (error) {
        console.error('Get OTP preferences error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOTPPreferences = getOTPPreferences;
const updateOTPPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { preferredMethod } = req.body;
        const result = await advancedOTPService_1.AdvancedOTPService.updateUserOTPPreferences(userId, {
            preferredMethod: preferredMethod
        });
        if (!result.success) {
            return res.status(500).json({ error: result.message });
        }
        return res.json({
            message: result.message
        });
    }
    catch (error) {
        console.error('Update OTP preferences error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateOTPPreferences = updateOTPPreferences;
const disableTOTP = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await advancedOTPService_1.AdvancedOTPService.disableTOTP(userId);
        if (!result.success) {
            return res.status(500).json({ error: result.message });
        }
        return res.json({
            message: result.message
        });
    }
    catch (error) {
        console.error('Disable TOTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.disableTOTP = disableTOTP;
const resendOTP = async (req, res) => {
    try {
        const { phone, type = 'LOGIN' } = req.body;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const result = await advancedOTPService_1.AdvancedOTPService.sendSMSOTP(phone, type);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({
            message: result.message,
            otp: result.otp
        });
    }
    catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.resendOTP = resendOTP;
const getProfile = async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            include: {
                farmer: true,
                agroCenter: true,
                supplier: true,
                agronomist: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user });
    }
    catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const userId = req.user.id;
        const updatedUser = await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone && { phone })
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                updatedAt: true
            }
        });
        return res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=auth.js.map