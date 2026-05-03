import { Request, Response } from 'express';
import { GridFSBucket, ObjectId } from 'mongodb';
import { getMongoDB } from '../utils/mongodb';
import { AuthRequest } from '../middlewares/auth';
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const uploadProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
      return;
    }

    const db = await getMongoDB();
    const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });

    // Generate unique filename
    const filename = `profile_${req.user!.id}_${Date.now()}`;
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        userId: req.user!.id,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        uploadedAt: new Date()
      }
    });

    // Handle upload events
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
        
        // Update user document with image reference
        const usersCollection = db.collection('users');
        await usersCollection.updateOne(
          { _id: new ObjectId(req.user!.id) },
          { 
            $set: { 
              profileImage: fileId,
              updatedAt: new Date()
            }
          }
        );

        res.json({
          success: true,
          message: 'Profile image uploaded successfully',
          data: {
            fileId: fileId,
            filename: filename
          }
        });
      } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update user profile'
        });
      }
    });

    // Write file to GridFS
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = await getMongoDB();
    const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });

    // Get user's profile image ID
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user!.id) },
      { projection: { profileImage: 1 } }
    );

    if (!user || !user.profileImage) {
      res.status(404).json({
        success: false,
        error: 'Profile image not found'
      });
      return;
    }

    // Find the image file
    const files = await bucket.find({ _id: new ObjectId(user.profileImage) }).toArray();
    
    if (files.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
      return;
    }

    const file = files[0];
    
    // Set appropriate headers
    res.set({
      'Content-Type': file.metadata?.contentType || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
    });

    // Stream the image
    const downloadStream = bucket.openDownloadStream(new ObjectId(user.profileImage));
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

  } catch (error) {
    console.error('Get profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const deleteProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = await getMongoDB();
    const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });

    // Get user's profile image ID
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user!.id) },
      { projection: { profileImage: 1 } }
    );

    if (!user || !user.profileImage) {
      res.status(404).json({
        success: false,
        error: 'Profile image not found'
      });
      return;
    }

    // Delete from GridFS
    await bucket.delete(new ObjectId(user.profileImage));

    // Remove reference from user document
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user!.id) },
      { 
        $unset: { profileImage: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({
      success: true,
      message: 'Profile image deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = await getMongoDB();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user!.id) },
      { 
        projection: { 
          password: 0, // Exclude password
          loginAttempts: 0,
          lockedUntil: 0
        }
      }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Get farmer profile if exists
    const farmerCollection = db.collection('farmers');
    const farmerProfile = await farmerCollection.findOne(
      { userId: new ObjectId(req.user!.id) }
    );

    // Construct profile image URL if exists
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

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
