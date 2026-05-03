"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoAuth_1 = require("../controllers/mongoAuth");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post('/register', mongoAuth_1.registerUser);
router.post('/login', mongoAuth_1.loginUser);
router.use(auth_1.authenticate);
router.get('/me', mongoAuth_1.getCurrentUser);
router.put('/profile', mongoAuth_1.updateProfile);
exports.default = router;
//# sourceMappingURL=mongoAuth.js.map