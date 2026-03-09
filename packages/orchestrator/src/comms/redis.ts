import Redis from "ioredis";

let _redis: Redis | null = null;
let _subscriber: Redis | null = null;

export function getRedis(url?: string, tls = false): Redis {
  if (_redis) {
    return _redis;
  }
  if (!url) {
    throw new Error("Redis URL required for first call");
  }
  _redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    keepAlive: 30_000,
    ...(tls ? { tls: { rejectUnauthorized: false } } : {}),
  });
  return _redis;
}

export function getSubscriber(url?: string, tls = false): Redis {
  if (_subscriber) {
    return _subscriber;
  }
  if (!url) {
    throw new Error("Redis URL required for first call");
  }
  _subscriber = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    keepAlive: 30_000,
    ...(tls ? { tls: { rejectUnauthorized: false } } : {}),
  });
  return _subscriber;
}

export async function closeRedis() {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
  if (_subscriber) {
    await _subscriber.quit();
    _subscriber = null;
  }
}
