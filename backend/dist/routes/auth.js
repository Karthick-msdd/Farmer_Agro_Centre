"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../controllers/auth");
const auth_2 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post('/register', auth_1.registerUser);
router.post('/login', auth_1.loginUser);
router.post('/refresh', auth_1.refreshToken);
router.post('/otp/send', auth_1.sendPhoneOTP);
router.post('/otp/verify', auth_1.verifyPhoneOTP);
router.post('/otp/resend', auth_1.resendOTP);
router.post('/totp/login', auth_1.loginWithTOTP);
router.post('/totp/setup', auth_2.authenticate, auth_1.setupTOTP);
router.post('/totp/verify-setup', auth_2.authenticate, auth_1.verifyTOTPSetup);
router.post('/totp/disable', auth_2.authenticate, auth_1.disableTOTP);
router.get('/otp/preferences', auth_2.authenticate, auth_1.getOTPPreferences);
router.put('/otp/preferences', auth_2.authenticate, auth_1.updateOTPPreferences);
router.post('/phone/send-otp', auth_1.sendPhoneOTP);
router.post('/phone/verify-otp', auth_1.verifyPhoneOTP);
router.get('/me', auth_2.authenticate, auth_1.getProfile);
router.put('/me', auth_2.authenticate, auth_1.updateProfile);
exports.default = router;
//# sourceMappingURL=auth.js.map