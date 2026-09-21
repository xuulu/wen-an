import "server-only";

/**
 * 基于内存的滑动窗口限流（单实例部署适用）。
 * key 一般为 `接口名:IP`，窗口内超过 limit 次则拒绝。
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// 定期清理，避免 Map 无限增长
const SWEEP_INTERVAL = 5 * 60 * 1000;
let lastSweep = Date.now();

export interface RateLimitResult {
  ok: boolean;
  /** 被限流时，距窗口内最早一次请求过去多少秒后可重试 */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (now - lastSweep > SWEEP_INTERVAL) {
    for (const [k, bucket] of buckets) {
      const fresh = bucket.timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) buckets.delete(k);
      else bucket.timestamps = fresh;
    }
    lastSweep = now;
  }

  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const earliest = bucket.timestamps[0] ?? now;
    buckets.set(key, bucket);
    return {
      ok: false,
      retryAfter: Math.ceil((earliest + windowMs - now) / 1000),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, retryAfter: 0 };
}

/** 从请求头提取客户端 IP（直连无代理时返回 unknown） */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
