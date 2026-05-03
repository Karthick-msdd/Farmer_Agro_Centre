"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const products_1 = require("../controllers/products");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.get('/', products_1.getProducts);
router.get('/search', products_1.searchProducts);
router.get('/category/:categoryId', products_1.getProductsByCategory);
router.get('/:id', products_1.getProductById);
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('SUPPLIER', 'AGROCENTER'), products_1.createProduct);
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPPLIER', 'AGROCENTER'), products_1.updateProduct);
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPPLIER', 'AGROCENTER'), products_1.deleteProduct);
exports.default = router;
//# sourceMappingURL=products.js.map