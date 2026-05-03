"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnection = exports.getRedis = exports.connectToRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class InMemoryRedis {
    constructor() {
        this.store = new Map();
    }
    async setex(key, seconds, value) {
        const expiresAt = Date.now() + seconds * 1000;
        this.store.set(key, { value, expiresAt });
    }
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    async del(key) {
        const existed = this.store.delete(key);
        return existed ? 1 : 0;
    }
    async incr(key) {
        const current = await this.get(key);
        const next = (current ? parseInt(current) : 0) + 1;
        const existing = this.store.get(key);
        const ttl = existing?.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000;
        this.store.set(key, { value: String(next), expiresAt: ttl });
        return next;
    }
    async ping() {
        return 'PONG';
    }
    async quit() {
        this.store.clear();
    }
}
let redis;
const connectToRedis = async () => {
    try {
        if (process.env.REDIS_DISABLED === 'true') {
            redis = new InMemoryRedis();
            console.warn('⚠️  Redis disabled via REDIS_DISABLED=true. Using in-memory store.');
            return;
        }
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const redisPassword = process.env.REDIS_PASSWORD || '';
        redis = new ioredis_1.default(redisUrl, {
            password: redisPassword,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
        });
        redis.on('connect', () => {
            console.log('✅ Connected to Redis successfully');
        });
        redis.on('error', (error) => {
            console.error('❌ Redis connection error:', error);
        });
        await redis.ping();
        console.log('✅ Redis ping successful');
    }
    catch (error) {
        console.error('❌ Redis connection error, falling back to in-memory store:', error);
        redis = new InMemoryRedis();
        console.warn('⚠️  Using in-memory Redis fallback. Do not use this in production.');
    }
};
exports.connectToRedis = connectToRedis;
const getRedis = () => {
    if (!redis) {
        throw new Error('Redis not connected. Call connectToRedis() first.');
    }
    return redis;
};
exports.getRedis = getRedis;
const closeRedisConnection = async () => {
    if (redis) {
        await redis.quit();
        console.log('✅ Redis connection closed');
    }
};
exports.closeRedisConnection = closeRedisConnection;
process.on('SIGINT', async () => {
    await (0, exports.closeRedisConnection)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await (0, exports.closeRedisConnection)();
    process.exit(0);
});
//# sourceMappingURL=redis.js.map