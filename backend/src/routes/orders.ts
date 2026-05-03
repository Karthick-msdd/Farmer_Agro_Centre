import express from 'express';
import { 
  getOrders, 
  getOrderById, 
  createOrder, 
  updateOrderStatus,
  cancelOrder
} from '../controllers/orders';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.put('/:id/status', authorize('AGROCENTER', 'ADMIN'), updateOrderStatus);
router.put('/:id/cancel', cancelOrder);

export default router;
