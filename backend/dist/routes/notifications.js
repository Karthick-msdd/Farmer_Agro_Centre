"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notifications_1 = require("../controllers/notifications");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', notifications_1.getNotifications);
router.put('/:id/read', notifications_1.markAsRead);
router.put('/read-all', notifications_1.markAllAsRead);
exports.default = router;
//# sourceMappingURL=notifications.js.map