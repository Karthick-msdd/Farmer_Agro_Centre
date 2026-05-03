"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_1 = require("../controllers/users");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post('/', users_1.createUser);
router.use(auth_1.authenticate);
router.get('/', (0, auth_1.authorize)('ADMIN'), users_1.getUsers);
router.get('/:id', users_1.getUserById);
router.put('/:id', users_1.updateUser);
router.delete('/:id', (0, auth_1.authorize)('ADMIN'), users_1.deleteUser);
exports.default = router;
//# sourceMappingURL=users.js.map