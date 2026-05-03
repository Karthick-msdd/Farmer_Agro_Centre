"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("./utils/mongodb");
const redis_1 = require("./utils/redis");
const auth_1 = __importDefault(require("./routes/auth"));
const mongoAuth_1 = __importDefault(require("./routes/mongoAuth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const cart_1 = __importDefault(require("./routes/cart"));
const payments_1 = __importDefault(require("./routes/payments"));
const advisory_1 = __importDefault(require("./routes/advisory"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const reports_1 = __importDefault(require("./routes/reports"));
const admin_1 = __importDefault(require("./routes/admin"));
const upload_1 = __importDefault(require("./routes/upload"));
const errorHandler_1 = require("./middlewares/errorHandler");
const errorHandler_2 = require("./middlewares/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
    req.io = io;
    next();
});
app.use('/api/auth', auth_1.default);
app.use('/api/mongo-auth', mongoAuth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/cart', cart_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/advisory', advisory_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/upload', upload_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });
    socket.on('leave-room', (room) => {
        socket.leave(room);
        console.log(`User ${socket.id} left room: ${room}`);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
app.use(errorHandler_2.notFound);
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await (0, mongodb_1.connectToMongoDB)();
        await (0, redis_1.connectToRedis)();
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 Socket.IO server ready`);
            console.log(`✅ MongoDB connected`);
            console.log(`✅ Redis connected`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map