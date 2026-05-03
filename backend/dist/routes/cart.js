"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cart_1 = require("../controllers/cart");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', cart_1.getCart);
router.post('/', cart_1.addToCart);
router.put('/:productId', cart_1.updateCartItem);
router.delete('/:productId', cart_1.removeFromCart);
router.delete('/', cart_1.clearCart);
exports.default = router;
//# sourceMappingURL=cart.js.map