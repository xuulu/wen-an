import { after, NextResponse } from "next/server";

import { getCurrentUser, getUserPasswordHash, verifyPassword } from "@/lib/auth";
import { getMySubmissions } from "@/lib/copywriting-data";
import { query } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { createJob, processBatchDeleteJob } from "@/lib/deletion-jobs";

/** 我的投稿：不传 pageSize 返回全部；超过 50 条时每页 20 条分页 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageSize = Number(searchParams.get("pageSize"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  if (pageSize > 0) {
    const result = await getMySubmissions(
      user.id,
      pageSize,
      (page - 1) * pageSize
    );
    return NextResponse.json(result);
  }

  const result = await getMySubmissions(user.id, 0, 0);
  return NextResponse.json(result);
}

/**
 * 批量软删自己的投稿（进入回收站，冷静期可恢复）。
 * body: { ids: string[], password: string, confirm: boolean }
 *   - 二次验证：必须提供登录密码且 confirm === true；
 *   - 被收藏数 ≥ 后台阈值的文案受保护，不会删除，随 protected 返回；
 *   - 实际分批处理在 after() 中执行，立即返回 202 + jobId。
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
    password?: unknown;
    confirm?: unknown;
  } | null;

  const ids = Array.isArray(body?.ids)
    ? body.ids
        .filter((id): id is string => typeof id === "string")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "未选择任何项" }, { status: 400 });
  }
  if (body?.confirm !== true) {
    return NextResponse.json({ error: "请勾选确认后再操作" }, { status: 400 });
  }

  // 二次验证：重新校验登录密码
  const password = typeof body?.password === "string" ? body.password : "";
  const storedHash = await getUserPasswordHash(user.id);
  if (!storedHash || !verifyPassword(password, storedHash)) {
    return NextResponse.json({ error: "密码错误，无法删除" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  const threshold = Number(settings.deletion_favorite_threshold) || 3;

  // 预演：剔除受保护项，受保护项即时反馈、不进入任务
  const deletableIds = await filterProtected(user.id, ids, threshold);

  const job = await createJob({
    kind: "batch_delete",
    userId: user.id,
    payload: { ids: deletableIds },
    total: deletableIds.length,
  });

  // 响应后异步分批处理，不阻塞请求
  after(() => processBatchDeleteJob(job.id, threshold));

  return NextResponse.json(
    {
      jobId: job.id,
      scheduled: deletableIds.length,
      protected: ids
        .filter((id) => !deletableIds.includes(id))
        .map((id) => ({ id: String(id) })),
    },
    { status: 202 }
  );
}

/** 剔除受保护项，返回本次可删除的 id 列表 */
async function filterProtected(
  userId: number,
  ids: number[],
  threshold: number
): Promise<number[]> {
  const { rows } = await query<{ id: number; fav_count: number }>(
    `SELECT c.id, COUNT(f.user_id)::int AS fav_count
     FROM wenan_copy_items c
     LEFT JOIN wenan_user_favorites f ON f.copy_id = c.id
     WHERE c.user_id = $1 AND c.id = ANY($2::bigint[]) AND c.deleted_at IS NULL
     GROUP BY c.id`,
    [userId, ids]
  );
  return rows.filter((r) => r.fav_count < threshold).map((r) => Number(r.id));
}
