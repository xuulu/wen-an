import "server-only";

/**
 * 用户批量投稿冷却：单实例内存存储「用户 id → 最近一次成功批量投稿时间戳」。
 * 冷却期间再次投稿返回 429。重启后失效（可接受）。
 */

const lastBatchAt = new Map<number, number>();

/** 返回剩余冷却秒数，0 表示可投稿 */
export function getUserBatchRetryAfter(
  userId: number,
  cooldownMs: number
): number {
  const last = lastBatchAt.get(userId) ?? 0;
  const wait = last + cooldownMs - Date.now();
  return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

/** 成功批量投稿后标记 */
export function markUserBatchDone(userId: number): void {
  lastBatchAt.set(userId, Date.now());
}
