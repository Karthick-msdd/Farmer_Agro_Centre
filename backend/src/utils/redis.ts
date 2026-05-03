import Redis from 'ioredis';

// Minimal in-memory Redis fallback for development/test
class InMemoryRedis {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async setex(key: string, seconds: number, value: string): Promise<void> {
    const expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = (current ? parseInt(current) : 0) + 1;
    // Default: 24h TTL if none set
    const existing = this.store.get(key);
    const ttl = existing?.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000;
    this.store.set(key, { value: String(next), expiresAt: ttl });
    return next;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

let redis: any;

export const connectToRedis = async (): Promise<void> => {
  try {
    // Allow disabling Redis entirely
    if (process.env.REDIS_DISABLED === 'true') {
      redis = new InMemoryRedis();
      console.warn('⚠️  Redis disabled via REDIS_DISABLED=true. Using in-memory store.');
      return;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisPassword = process.env.REDIS_PASSWORD || '';

    redis = new Redis(redisUrl, {
      password: redisPassword,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redis.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    redis.on('error', (error: any) => {
      console.error('❌ Redis connection error:', error);
    });

    // Test the connection
    await redis.ping();
    console.log('✅ Redis ping successful');
  } catch (error) {
    console.error('❌ Redis connection error, falling back to in-memory store:', error);
    // Fallback to in-memory implementation so the app can run locally
    redis = new InMemoryRedis();
    console.warn('⚠️  Using in-memory Redis fallback. Do not use this in production.');
  }
};

export const getRedis = (): any => {
  if (!redis) {
    throw new Error('Redis not connected. Call connectToRedis() first.');
  }
  return redis;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    console.log('✅ Redis connection closed');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedisConnection();
  process.exit(0);
});
