import express from 'express';
import { 
  createPaymentIntent, 
  handlePaymentWebhook,
  getPaymentStatus
} from '../controllers/payments';

const router = express.Router();

router.post('/create-intent', createPaymentIntent);
router.post('/webhook', handlePaymentWebhook);
router.get('/status/:orderId', getPaymentStatus);

export default router;
