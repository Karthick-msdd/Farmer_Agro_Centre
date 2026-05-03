import express from 'express';
import { 
  registerUser, 
  loginUser, 
  refreshToken, 
  sendPhoneOTP, 
  verifyPhoneOTP, 
  resendOTP,
  setupTOTP,
  verifyTOTPSetup,
  loginWithTOTP,
  getOTPPreferences,
  updateOTPPreferences,
  disableTOTP,
  getProfile, 
  updateProfile 
} from '../controllers/auth';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);

// SMS OTP routes
router.post('/otp/send', sendPhoneOTP);
router.post('/otp/verify', verifyPhoneOTP);
router.post('/otp/resend', resendOTP);

// TOTP routes
router.post('/totp/login', loginWithTOTP);
router.post('/totp/setup', authenticate, setupTOTP);
router.post('/totp/verify-setup', authenticate, verifyTOTPSetup);
router.post('/totp/disable', authenticate, disableTOTP);

// OTP preferences
router.get('/otp/preferences', authenticate, getOTPPreferences);
router.put('/otp/preferences', authenticate, updateOTPPreferences);

// Legacy OTP routes (for backward compatibility)
router.post('/phone/send-otp', sendPhoneOTP);
router.post('/phone/verify-otp', verifyPhoneOTP);

// Protected routes
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);

export default router;
