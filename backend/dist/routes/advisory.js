"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const advisory_1 = require("../controllers/advisory");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', advisory_1.getAdvisoryRequests);
router.post('/', advisory_1.createAdvisoryRequest);
router.put('/:id', advisory_1.updateAdvisoryRequest);
router.post('/:id/reply', (0, auth_1.authorize)('AGRONOMIST', 'ADMIN'), advisory_1.replyToAdvisory);
exports.default = router;
//# sourceMappingURL=advisory.js.map