"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getCurrentUser = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, role = 'FARMER', farmSize, cropTypes, location } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }
        const existingUser = await User_1.UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const userData = {
            name,
            email,
            phone,
            password: hashedPassword,
            role,
            farmSize,
            cropTypes,
            location
        };
        const user = await User_1.UserModel.create(userData);
        const { password: _, ...userWithoutPassword } = user;
        const token = jsonwebtoken_1.default.sign({ userId: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        return res.status(201).json({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            },
            message: 'User registered successfully'
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to register user'
        });
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        const user = await User_1.UserModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        await User_1.UserModel.updateLastLogin(user._id);
        const { password: _, ...userWithoutPassword } = user;
        const token = jsonwebtoken_1.default.sign({ userId: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        return res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            },
            message: 'Login successful'
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to login'
        });
    }
};
exports.loginUser = loginUser;
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const { password, ...userWithoutPassword } = user;
        return res.json({
            success: true,
            data: userWithoutPassword
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get user data'
        });
    }
};
exports.getCurrentUser = getCurrentUser;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const updateData = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        if (updateData.password) {
            updateData.password = await bcryptjs_1.default.hash(updateData.password, 12);
        }
        const updatedUser = await User_1.UserModel.update(userId, updateData);
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const { password, ...userWithoutPassword } = updatedUser;
        return res.json({
            success: true,
            data: userWithoutPassword,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=mongoAuth.js.map