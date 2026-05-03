"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orders_1 = require("../controllers/orders");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', orders_1.getOrders);
router.get('/:id', orders_1.getOrderById);
router.post('/', orders_1.createOrder);
router.put('/:id/status', (0, auth_1.authorize)('AGROCENTER', 'ADMIN'), orders_1.updateOrderStatus);
router.put('/:id/cancel', orders_1.cancelOrder);
exports.default = router;
//# sourceMappingURL=orders.js.map