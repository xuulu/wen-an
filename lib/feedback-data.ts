import "server-only";
import { query } from "@/lib/db";
import type {
  Feedback,
  FeedbackStatus,
  FeedbackType,
} from "@/lib/feedback";

interface FeedbackRow {
  id: number;
  user_id: number;
  nickname: string;
  type: FeedbackType;
  content: string;
  contact: string;
  admin_reply: string | null;
  status: FeedbackStatus;
  created_at: Date | string;
}

export interface FeedbackPage {
  items: Feedback[];
  total: number;
}

const PAGE_SIZE = 10;

function mapRow(row: FeedbackRow): Feedback {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    username: row.nickname,
    type: row.type,
    content: row.content,
    contact: row.contact,
    adminReply: row.admin_reply ?? "",
    status: row.status,
    createdAt: createdAt.slice(0, 16).replace("T", " "),
  };
}

/** 用户提交反馈 */
export async function createFeedback(
  userId: number,
  data: { type: FeedbackType; content: string; contact: string }
): Promise<Feedback> {
  const { rows } = await query<FeedbackRow>(
    `INSERT INTO wenan_feedbacks (user_id, type, content, contact)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id,
       (SELECT nickname FROM wenan_users u WHERE u.id = user_id) AS nickname,
       type, content, contact, admin_reply, status, created_at`,
    [userId, data.type, data.content, data.contact]
  );
  const row = rows[0];
  if (!row) throw new Error("提交反馈失败");
  return mapRow(row);
}

/** 用户查看自己的反馈（最新在前） */
export async function getMyFeedbacks(userId: number): Promise<Feedback[]> {
  const { rows } = await query<FeedbackRow>(
    `SELECT f.id, f.user_id, u.nickname, f.type, f.content, f.contact,
            f.admin_reply, f.status, f.created_at
     FROM wenan_feedbacks f
     JOIN wenan_users u ON u.id = f.user_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC, f.id DESC`,
    [userId]
  );
  return rows.map(mapRow);
}

/** 管理员查看反馈，可按状态过滤（分页） */
export async function getAllFeedbacks(
  status: "all" | FeedbackStatus,
  page = 1
): Promise<FeedbackPage> {
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * PAGE_SIZE;
  const conds: string[] = [];
  const params: unknown[] = [];
  if (status !== "all") {
    params.push(status);
    conds.push(`f.status = $${params.length}`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";

  const { rows: countRows } = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM wenan_feedbacks f ${where}`,
    params
  );
  const total = countRows[0]?.total ?? 0;

  const { rows } = await query<FeedbackRow>(
    `SELECT f.id, f.user_id, u.nickname, f.type, f.content, f.contact,
            f.admin_reply, f.status, f.created_at
     FROM wenan_feedbacks f
     JOIN wenan_users u ON u.id = f.user_id
     ${where}
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params
  );

  return { items: rows.map(mapRow), total };
}

/** 管理员回复反馈，状态置为已回复 */
export async function replyFeedback(
  id: string,
  reply: string
): Promise<Feedback | null> {
  const { rows, rowCount } = await query<FeedbackRow>(
    `UPDATE wenan_feedbacks
     SET admin_reply = $1, status = 'replied'
     WHERE id = $2
     RETURNING id, user_id,
       (SELECT nickname FROM wenan_users u WHERE u.id = user_id) AS nickname,
       type, content, contact, admin_reply, status, created_at`,
    [reply, Number(id)]
  );
  if ((rowCount ?? 0) === 0) return null;
  const row = rows[0];
  return row ? mapRow(row) : null;
}

/** 用户申请关闭自己的反馈工单（已关闭的忽略），返回是否关闭成功 */
export async function closeMyFeedback(userId: number, id: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE wenan_feedbacks SET status = 'closed'
     WHERE id = $1 AND user_id = $2 AND status <> 'closed'`,
    [Number(id), userId]
  );
  return (rowCount ?? 0) > 0;
}

/** 管理员关闭工单（已关闭的忽略），返回是否关闭成功 */
export async function closeFeedback(id: string): Promise<boolean> {
  const { rowCount } = await query(
    "UPDATE wenan_feedbacks SET status = 'closed' WHERE id = $1 AND status <> 'closed'",
    [Number(id)]
  );
  return (rowCount ?? 0) > 0;
}

/** 管理员删除工单，返回是否存在 */
export async function deleteFeedback(id: string): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM wenan_feedbacks WHERE id = $1",
    [Number(id)]
  );
  return (rowCount ?? 0) > 0;
}

/** 待处理反馈数量（后台统计用） */
export async function getPendingFeedbackCount(): Promise<number> {
  const { rows } = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM wenan_feedbacks WHERE status = 'pending'"
  );
  return rows[0]?.count ?? 0;
}
