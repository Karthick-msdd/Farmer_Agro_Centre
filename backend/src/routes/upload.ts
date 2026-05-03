import express from 'express';
import { 
  upload, 
  uploadProfileImage, 
  getProfileImage, 
  deleteProfileImage,
  getUserProfile 
} from '../controllers/upload';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload profile image
router.post('/profile-image', upload.single('profileImage'), uploadProfileImage);

// Get profile image
router.get('/profile-image', getProfileImage);

// Delete profile image
router.delete('/profile-image', deleteProfileImage);

// Get user profile with image
router.get('/profile', getUserProfile);

export default router;
