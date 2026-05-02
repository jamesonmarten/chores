// FILE: api/_lib/store.js
// Storage shim: Upstash Redis in production (Vercel Marketplace integration auto-injects
// KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// Falls back to in-memory for `vercel dev` without a Redis store.
let _redis = null;
let _mem = null;

function memShim() {
  if (_mem) return _mem;
  const map = new Map();
  _mem = {
    async get(k)      { return map.has(k) ? JSON.parse(JSON.stringify(map.get(k))) : null; },
    async set(k, v)   { map.set(k, v); return 'OK'; },
    async lpush(k, ...vals) {
      const arr = map.get(k) || [];
      arr.unshift(...vals);
      map.set(k, arr);
      return arr.length;
    },
    async sadd(k, v)  {
      const s = map.get(k) || new Set();
      const had = s.has(v);
      s.add(v);
      map.set(k, s);
      return had ? 0 : 1;
    },
    async smembers(k) { return Array.from(map.get(k) || []); },
    async scard(k)    { return (map.get(k) || new Set()).size; },
  };
  return _mem;
}

function envCreds() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export async function getStore() {
  if (_redis) return _redis;
  const creds = envCreds();
  if (creds) {
    try {
      const { Redis } = await import('@upstash/redis');
      const r = new Redis(creds);
      // wrap so callers can `store.get` returning a parsed object (Upstash already JSON-decodes)
      _redis = {
        async get(k)      { return await r.get(k); },
        async set(k, v)   { return r.set(k, v); },
        async lpush(k, ...vals) { return r.lpush(k, ...vals); },
        async sadd(k, v)  { return r.sadd(k, v); },
        async smembers(k) { return r.smembers(k); },
        async scard(k)    { return r.scard(k); },
      };
      return _redis;
    } catch (err) {
      console.warn('Failed to load @upstash/redis, falling back to memory:', err.message);
    }
  }
  return memShim();
}

export function hasPersistentStore() {
  return !!envCreds();
}
