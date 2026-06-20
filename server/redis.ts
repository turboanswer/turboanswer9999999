import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL || null;

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  if (!REDIS_URL) {
    console.log("[Redis] No REDIS_URL configured — skipping Redis integration.");
    return null;
  }
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      reconnectOnError: (err) => {
        console.warn("[Redis] reconnectOnError:", err.message);
        return true;
      },
    });
    redisClient.on("connect", () => console.log("[Redis] Connected"));
    redisClient.on("error", (err) => console.error("[Redis] Error:", err.message));
    return redisClient;
  } catch (err: any) {
    console.error("[Redis] Failed to create client:", err.message);
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  if (ttlSeconds) {
    await r.set(key, value, "EX", ttlSeconds);
  } else {
    await r.set(key, value);
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedisClient();
  if (!r) return null;
  return r.get(key);
}

export async function redisDel(key: string): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  await r.del(key);
}

export async function redisIncr(key: string): Promise<number> {
  const r = getRedisClient();
  if (!r) return 0;
  return r.incr(key);
}

export async function redisExpire(key: string, ttlSeconds: number): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  await r.expire(key, ttlSeconds);
}

export async function redisHSet(key: string, field: string, value: string): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  await r.hset(key, field, value);
}

export async function redisHGet(key: string, field: string): Promise<string | null> {
  const r = getRedisClient();
  if (!r) return null;
  return r.hget(key, field);
}

export async function redisHGetAll(key: string): Promise<Record<string, string>> {
  const r = getRedisClient();
  if (!r) return {};
  return r.hgetall(key);
}

export async function redisHDel(key: string, field: string): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  await r.hdel(key, field);
}

export async function redisKeys(pattern: string): Promise<string[]> {
  const r = getRedisClient();
  if (!r) return [];
  return r.keys(pattern);
}
