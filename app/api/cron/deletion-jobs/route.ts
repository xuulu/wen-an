import { NextResponse } from "next/server";

import { purgeExpiredDeleted } from "@/lib/copywriting-data";
import { getSiteSettings } from "@/lib/site-settings";
import {
  findStuckJobs,
  processBatchDeleteJob,
  processDeactivateJob,
} from "@/lib/deletion-jobs";

/**
 * 定时维护：回收站物理清理 + 卡住任务续跑。
 *
 * 触发（二选一）：
 *   1. 外部 cron（Linux crontab / 守护进程），带密钥：
 *      curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://<域名>/api/cron/deletion-jobs
 *   2. 建议 crontab：每天凌晨 3:17 执行
 *      17 3 * * * curl -s -H "Authorization: Bearer <CRON_SECRET>" \
 *        http://127.0.0.1:3000/api/cron/deletion-jobs
 *
 * 密钥取 env CRON_SECRET；未配置时拒绝外部访问（防匿名触发）。
 */
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  const graceDays = Number(settings.deletion_grace_days) || 30;
  const threshold = Number(settings.deletion_favorite_threshold) || 3;

  // 1) 物理清理过期回收站内容：每次最多处理 10 批 × 100 条，避免单次过重
  let purged = 0;
  for (let i = 0; i < 10; i++) {
    const n = await purgeExpiredDeleted(graceDays, 100);
    purged += n;
    if (n < 100) break;
  }

  // 2) 续跑卡住任务
  const stuck = await findStuckJobs(10);
  const resumed: number[] = [];
  for (const job of stuck) {
    if (job.kind === "batch_delete") {
      await processBatchDeleteJob(job.id, threshold);
    } else {
      await processDeactivateJob(job.id);
    }
    resumed.push(job.id);
  }

  return NextResponse.json({ ok: true, purged, resumed });
}
