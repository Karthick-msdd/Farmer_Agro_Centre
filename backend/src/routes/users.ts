import express from 'express';
import { 
  getUsers, 
  updateUser, 
  deleteUser,
  getUserById,
  createUser
} from '../controllers/users';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

// Public route for user creation (registration)
router.post('/', createUser);

// Protected routes
router.use(authenticate);

router.get('/', authorize('ADMIN'), getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', authorize('ADMIN'), deleteUser);

export default router;
