import express from 'express';
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getProductsByCategory,
  searchProducts
} from '../controllers/products';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProductById);

// Protected routes (suppliers and agro centers)
router.post('/', authenticate, authorize('SUPPLIER', 'AGROCENTER'), createProduct);
router.put('/:id', authenticate, authorize('SUPPLIER', 'AGROCENTER'), updateProduct);
router.delete('/:id', authenticate, authorize('SUPPLIER', 'AGROCENTER'), deleteProduct);

export default router;
