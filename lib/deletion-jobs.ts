import "server-only";

import { query } from "@/lib/db";
import {
  deactivateAndAnonymize,
  softDeleteMySubmissions,
} from "@/lib/copywriting-data";

/**
 * 批量删除 / 注销异步任务服务。
 *
 * 设计：API 校验密码 + 预演（算出受保护项）→ 写任务（pending）→ 响应 202；
 * 真正的分批处理在 Next `after()`（响应后）执行，避免长时间持有请求 / 锁表；
 * 若进程重启导致任务卡在 pending/processing，由 /api/cron/deletion-jobs 兜底续跑。
 */

export type JobKind = "batch_delete" | "deactivate";
export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface DeletionJob {
  id: number;
  userId: number | null;
  kind: JobKind;
  status: JobStatus;
  total: number;
  processed: number;
  payload: Record<string, unknown>;
  error: string;
  createdAt: string;
  updatedAt: string;
}

interface JobRow {
  id: number;
  user_id: number | null;
  kind: JobKind;
  status: JobStatus;
  total: number;
  processed: number;
  payload: Record<string, unknown>;
  error: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapJob(row: JobRow): DeletionJob {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    status: row.status,
    total: row.total,
    processed: row.processed,
    payload: row.payload ?? {},
    error: row.error,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** 创建任务 */
export async function createJob(input: {
  kind: JobKind;
  userId: number;
  payload?: Record<string, unknown>;
  total?: number;
}): Promise<DeletionJob> {
  const { rows } = await query<JobRow>(
    `INSERT INTO wenan_deletion_jobs (user_id, kind, payload, total)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.userId,
      input.kind,
      JSON.stringify(input.payload ?? {}),
      input.total ?? 0,
    ]
  );
  return mapJob(rows[0]);
}

export async function getJob(id: number): Promise<DeletionJob | null> {
  const { rows } = await query<JobRow>(
    "SELECT * FROM wenan_deletion_jobs WHERE id = $1",
    [id]
  );
  return rows.length ? mapJob(rows[0]) : null;
}

async function setStatus(
  id: number,
  status: JobStatus,
  extra?: { processed?: number; error?: string }
) {
  await query(
    `UPDATE wenan_deletion_jobs
     SET status = $1, updated_at = CURRENT_TIMESTAMP,
         processed = COALESCE($2, processed),
         error = COALESCE($3, error)
     WHERE id = $4`,
    [status, extra?.processed ?? null, extra?.error ?? null, id]
  );
}

/** 卡住（pending/processing 超过 staleMinutes）的任务，供 cron 续跑 */
export async function findStuckJobs(staleMinutes = 10): Promise<DeletionJob[]> {
  const { rows } = await query<JobRow>(
    `SELECT * FROM wenan_deletion_jobs
     WHERE status IN ('pending','processing')
       AND updated_at < CURRENT_TIMESTAMP - ($1 || ' minutes')::interval
     ORDER BY id ASC
     LIMIT 20`,
    [staleMinutes]
  );
  return rows.map(mapJob);
}

/** 每批软删条数（控制单次 UPDATE 持锁范围） */
const CHUNK = 50;

/**
 * 执行批量软删任务：把 payload.ids 分块，逐块软删并更新进度。
 * favoriteThreshold 为收藏保护阈值。
 */
export async function processBatchDeleteJob(
  jobId: number,
  favoriteThreshold: number
): Promise<void> {
  const job = await getJob(jobId);
  if (!job || job.status === "completed" || job.status === "cancelled") return;

  await setStatus(jobId, "processing");
  try {
    const rawIds = Array.isArray(job.payload.ids)
      ? (job.payload.ids as unknown[])
      : [];
    const ids = rawIds
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);

    let processed = 0;
    const protectedAll: { id: number; favCount: number }[] = [];

    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const result = await softDeleteMySubmissions(
        job.userId ?? 0,
        chunk,
        favoriteThreshold
      );
      protectedAll.push(...result.protected);
      processed += chunk.length;
      await setStatus(jobId, "processing", { processed });
    }

    await query(
      `UPDATE wenan_deletion_jobs
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP,
           processed = $1,
           payload = jsonb_set(COALESCE(payload,'{}'::jsonb), '{protected}', $2::jsonb)
       WHERE id = $3`,
      [processed, JSON.stringify(protectedAll), jobId]
    );
  } catch (err) {
    await setStatus(jobId, "failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** 执行注销匿名化任务 */
export async function processDeactivateJob(jobId: number): Promise<void> {
  const job = await getJob(jobId);
  if (!job || !job.userId || job.status === "completed") return;
  await setStatus(jobId, "processing");
  try {
    const result = await deactivateAndAnonymize(job.userId);
    await query(
      `UPDATE wenan_deletion_jobs
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP,
           processed = $1, total = $1,
           payload = jsonb_set(COALESCE(payload,'{}'::jsonb), '{result}', $2::jsonb)
       WHERE id = $3`,
      [
        result.anonymized + result.softDeleted,
        JSON.stringify(result),
        jobId,
      ]
    );
  } catch (err) {
    await setStatus(jobId, "failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
