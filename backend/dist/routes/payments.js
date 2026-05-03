"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payments_1 = require("../controllers/payments");
const router = express_1.default.Router();
router.post('/create-intent', payments_1.createPaymentIntent);
router.post('/webhook', payments_1.handlePaymentWebhook);
router.get('/status/:orderId', payments_1.getPaymentStatus);
exports.default = router;
//# sourceMappingURL=payments.js.map