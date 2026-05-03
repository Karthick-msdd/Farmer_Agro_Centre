"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reports_1 = require("../controllers/reports");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('AGROCENTER', 'ADMIN'));
router.get('/sales', reports_1.getSalesReport);
router.get('/top-products', reports_1.getTopProducts);
router.get('/low-stock', reports_1.getLowStockItems);
router.get('/orders', reports_1.getOrderAnalytics);
exports.default = router;
//# sourceMappingURL=reports.js.map