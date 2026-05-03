import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../controllers/notifications';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

export default router;
