"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getUsers = void 0;
const User_1 = require("../models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const getUsers = async (req, res) => {
    try {
        const users = await User_1.UserModel.getAll();
        const usersWithoutPassword = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
        return res.json({
            success: true,
            data: usersWithoutPassword,
            count: users.length
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.UserModel.findById(id);
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
        console.error('Error fetching user:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
};
exports.getUserById = getUserById;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.password) {
            updateData.password = await bcryptjs_1.default.hash(updateData.password, 12);
        }
        const updatedUser = await User_1.UserModel.update(id, updateData);
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
            message: 'User updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await User_1.UserModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        return res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
};
exports.deleteUser = deleteUser;
const createUser = async (req, res) => {
    try {
        const userData = req.body;
        const existingUser = await User_1.UserModel.findByEmail(userData.email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        userData.password = await bcryptjs_1.default.hash(userData.password, 12);
        const newUser = await User_1.UserModel.create(userData);
        const { password, ...userWithoutPassword } = newUser;
        return res.status(201).json({
            success: true,
            data: userWithoutPassword,
            message: 'User created successfully'
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
};
exports.createUser = createUser;
//# sourceMappingURL=users.js.map