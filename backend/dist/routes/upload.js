"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const upload_1 = require("../controllers/upload");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.post('/profile-image', upload_1.upload.single('profileImage'), upload_1.uploadProfileImage);
router.get('/profile-image', upload_1.getProfileImage);
router.delete('/profile-image', upload_1.deleteProfileImage);
router.get('/profile', upload_1.getUserProfile);
exports.default = router;
//# sourceMappingURL=upload.js.map