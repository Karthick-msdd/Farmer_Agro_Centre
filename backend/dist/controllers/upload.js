"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = exports.deleteProfileImage = exports.getProfileImage = exports.uploadProfileImage = exports.upload = void 0;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../utils/mongodb");
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
            return;
        }
        const db = await (0, mongodb_2.getMongoDB)();
        const bucket = new mongodb_1.GridFSBucket(db, { bucketName: 'profileImages' });
        const filename = `profile_${req.user.id}_${Date.now()}`;
        const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
                userId: req.user.id,
                originalName: req.file.originalname,
                contentType: req.file.mimetype,
                uploadedAt: new Date()
            }
        });
        uploadStream.on('error', (error) => {
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload image'
            });
        });
        uploadStream.on('finish', async () => {
            try {
                const fileId = uploadStream.id.toString();
                const usersCollection = db.collection('users');
                await usersCollection.updateOne({ _id: new mongodb_1.ObjectId(req.user.id) }, {
                    $set: {
                        profileImage: fileId,
                        updatedAt: new Date()
                    }
                });
                res.json({
                    success: true,
                    message: 'Profile image uploaded successfully',
                    data: {
                        fileId: fileId,
                        filename: filename
                    }
                });
            }
            catch (error) {
                console.error('Error updating user profile:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update user profile'
                });
            }
        });
        uploadStream.end(req.file.buffer);
    }
    catch (error) {
        console.error('Upload profile image error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.uploadProfileImage = uploadProfileImage;
const getProfileImage = async (req, res) => {
    try {
        const db = await (0, mongodb_2.getMongoDB)();
        const bucket = new mongodb_1.GridFSBucket(db, { bucketName: 'profileImages' });
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(req.user.id) }, { projection: { profileImage: 1 } });
        if (!user || !user.profileImage) {
            res.status(404).json({
                success: false,
                error: 'Profile image not found'
            });
            return;
        }
        const files = await bucket.find({ _id: new mongodb_1.ObjectId(user.profileImage) }).toArray();
        if (files.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Image file not found'
            });
            return;
        }
        const file = files[0];
        res.set({
            'Content-Type': file.metadata?.contentType || 'image/jpeg',
            'Content-Length': file.length,
            'Cache-Control': 'public, max-age=31536000'
        });
        const downloadStream = bucket.openDownloadStream(new mongodb_1.ObjectId(user.profileImage));
        downloadStream.pipe(res);
        downloadStream.on('error', (error) => {
            console.error('Download error:', error);
            if (!res.headersSent) {
                res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }
        });
    }
    catch (error) {
        console.error('Get profile image error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getProfileImage = getProfileImage;
const deleteProfileImage = async (req, res) => {
    try {
        const db = await (0, mongodb_2.getMongoDB)();
        const bucket = new mongodb_1.GridFSBucket(db, { bucketName: 'profileImages' });
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(req.user.id) }, { projection: { profileImage: 1 } });
        if (!user || !user.profileImage) {
            res.status(404).json({
                success: false,
                error: 'Profile image not found'
            });
            return;
        }
        await bucket.delete(new mongodb_1.ObjectId(user.profileImage));
        await usersCollection.updateOne({ _id: new mongodb_1.ObjectId(req.user.id) }, {
            $unset: { profileImage: 1 },
            $set: { updatedAt: new Date() }
        });
        res.json({
            success: true,
            message: 'Profile image deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete profile image error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.deleteProfileImage = deleteProfileImage;
const getUserProfile = async (req, res) => {
    try {
        const db = await (0, mongodb_2.getMongoDB)();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(req.user.id) }, {
            projection: {
                password: 0,
                loginAttempts: 0,
                lockedUntil: 0
            }
        });
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        const farmerCollection = db.collection('farmers');
        const farmerProfile = await farmerCollection.findOne({ userId: new mongodb_1.ObjectId(req.user.id) });
        let profileImageUrl = null;
        if (user.profileImage) {
            profileImageUrl = `/api/upload/profile-image/${user.profileImage}`;
        }
        res.json({
            success: true,
            data: {
                user: {
                    ...user,
                    profileImageUrl
                },
                farmerProfile
            }
        });
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getUserProfile = getUserProfile;
//# sourceMappingURL=upload.js.map