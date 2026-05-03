import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getCurrentUser, 
  updateProfile 
} from '../controllers/mongoAuth';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.use(authenticate);
router.get('/me', getCurrentUser);
router.put('/profile', updateProfile);

export default router;
