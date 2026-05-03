import express from 'express';
import { 
  getSalesReport, 
  getTopProducts, 
  getLowStockItems,
  getOrderAnalytics
} from '../controllers/reports';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

router.use(authenticate);
router.use(authorize('AGROCENTER', 'ADMIN'));

router.get('/sales', getSalesReport);
router.get('/top-products', getTopProducts);
router.get('/low-stock', getLowStockItems);
router.get('/orders', getOrderAnalytics);

export default router;
