import express from 'express';
import { 
  getAdvisoryRequests, 
  createAdvisoryRequest, 
  updateAdvisoryRequest,
  replyToAdvisory
} from '../controllers/advisory';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAdvisoryRequests);
router.post('/', createAdvisoryRequest);
router.put('/:id', updateAdvisoryRequest);
router.post('/:id/reply', authorize('AGRONOMIST', 'ADMIN'), replyToAdvisory);

export default router;
