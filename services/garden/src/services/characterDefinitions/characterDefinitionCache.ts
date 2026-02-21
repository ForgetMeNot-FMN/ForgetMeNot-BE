type CacheItem<T> = {
  data: T;
  expiresAt: number;
};

const cache = new Map<string, CacheItem<any>>();
const TTL = 1000 * 60 * 60; // 1 saat

export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

export function setCache<T>(key: string, data: T) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + TTL,
  });
}

export function clearCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}