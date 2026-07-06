import { config } from "./config";

/**
 * 低階 KV 抽象：只暴露投票系統需要的原子操作，底下兩種實作：
 *   - memory ：in-process Map（本地開發，重啟即清空，免任何帳號）
 *   - upstash：Upstash Redis（Vercel production）
 *
 * 所有值一律以「字串」存放（JSON 自行 stringify/parse），讓兩種後端語意一致。
 * 防重複投票靠 hSetNX 的原子性（memory 因 JS 單執行緒天生原子；redis 由 server 保證）。
 */
export interface Kv {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T): Promise<void>;
  hGetAllJSON<T>(key: string): Promise<Record<string, T>>;
  hGetJSON<T>(key: string, field: string): Promise<T | null>;
  hSetJSON<T>(key: string, field: string, value: T): Promise<void>;
  hDel(key: string, field: string): Promise<void>;
  hIncrBy(key: string, field: string, delta: number): Promise<number>;
  hGetAllNumbers(key: string): Promise<Record<string, number>>;
  /** 原子設定：field 不存在時寫入並回傳 true；已存在則不動並回傳 false。 */
  hSetNX(key: string, field: string, value: string): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
}

// 讀取時容錯：upstash 有時已幫你 parse 成物件，字串才需自己 parse。
function parseMaybe<T>(v: unknown): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }
  return v as T;
}

// ── memory 後端 ────────────────────────────────────────────
class MemoryKv implements Kv {
  private plain = new Map<string, string>();
  private hashes = new Map<string, Map<string, string>>();

  private hash(key: string): Map<string, string> {
    let h = this.hashes.get(key);
    if (!h) {
      h = new Map();
      this.hashes.set(key, h);
    }
    return h;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const v = this.plain.get(key);
    return v === undefined ? null : (JSON.parse(v) as T);
  }
  async setJSON<T>(key: string, value: T): Promise<void> {
    this.plain.set(key, JSON.stringify(value));
  }
  async hGetAllJSON<T>(key: string): Promise<Record<string, T>> {
    const out: Record<string, T> = {};
    for (const [f, v] of this.hash(key)) out[f] = JSON.parse(v) as T;
    return out;
  }
  async hGetJSON<T>(key: string, field: string): Promise<T | null> {
    const v = this.hash(key).get(field);
    return v === undefined ? null : (JSON.parse(v) as T);
  }
  async hSetJSON<T>(key: string, field: string, value: T): Promise<void> {
    this.hash(key).set(field, JSON.stringify(value));
  }
  async hDel(key: string, field: string): Promise<void> {
    this.hash(key).delete(field);
  }
  async hIncrBy(key: string, field: string, delta: number): Promise<number> {
    const cur = Number(this.hash(key).get(field) ?? 0) + delta;
    this.hash(key).set(field, String(cur));
    return cur;
  }
  async hGetAllNumbers(key: string): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const [f, v] of this.hash(key)) out[f] = Number(v);
    return out;
  }
  async hSetNX(key: string, field: string, value: string): Promise<boolean> {
    const h = this.hash(key);
    if (h.has(field)) return false;
    h.set(field, value);
    return true;
  }
  async del(...keys: string[]): Promise<void> {
    for (const k of keys) {
      this.plain.delete(k);
      this.hashes.delete(k);
    }
  }
}

// memory 後端在 dev 熱重載間需保活 → 掛在 globalThis。
const g = globalThis as unknown as { __partyKv?: MemoryKv };
function memoryKv(): MemoryKv {
  if (!g.__partyKv) g.__partyKv = new MemoryKv();
  return g.__partyKv;
}

// ── upstash 後端 ───────────────────────────────────────────
let upstashCache: Kv | null = null;
async function upstashKv(): Promise<Kv> {
  if (upstashCache) return upstashCache;
  const { Redis } = await import("@upstash/redis");
  // Vercel Marketplace 整合注入 KV_REST_API_*；獨立 Upstash 帳號注入 UPSTASH_REDIS_REST_*。兩者皆吃。
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  if (!url || !token) {
    throw new Error(
      "Upstash 未設定：請設 UPSTASH_REDIS_REST_URL/TOKEN（或 Vercel 整合的 KV_REST_API_URL/TOKEN）",
    );
  }
  const redis = new Redis({ url, token });

  upstashCache = {
    async getJSON<T>(key: string) {
      return parseMaybe<T>(await redis.get(key));
    },
    async setJSON<T>(key: string, value: T) {
      await redis.set(key, JSON.stringify(value));
    },
    async hGetAllJSON<T>(key: string) {
      const raw = await redis.hgetall<Record<string, unknown>>(key);
      const out: Record<string, T> = {};
      if (raw) for (const [f, v] of Object.entries(raw)) {
        const parsed = parseMaybe<T>(v);
        if (parsed !== null) out[f] = parsed;
      }
      return out;
    },
    async hGetJSON<T>(key: string, field: string) {
      return parseMaybe<T>(await redis.hget(key, field));
    },
    async hSetJSON<T>(key: string, field: string, value: T) {
      await redis.hset(key, { [field]: JSON.stringify(value) });
    },
    async hDel(key: string, field: string) {
      await redis.hdel(key, field);
    },
    async hIncrBy(key: string, field: string, delta: number) {
      return await redis.hincrby(key, field, delta);
    },
    async hGetAllNumbers(key: string) {
      const raw = await redis.hgetall<Record<string, unknown>>(key);
      const out: Record<string, number> = {};
      if (raw) for (const [f, v] of Object.entries(raw)) out[f] = Number(v);
      return out;
    },
    async hSetNX(key: string, field: string, value: string) {
      const res = await redis.hsetnx(key, field, value);
      return res === 1;
    },
    async del(...keys: string[]) {
      if (keys.length) await redis.del(...keys);
    },
  };
  return upstashCache;
}

export async function getKv(): Promise<Kv> {
  return config.kvProvider === "upstash" ? upstashKv() : memoryKv();
}
