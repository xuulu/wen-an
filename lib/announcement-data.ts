import { query } from "@/lib/db";
import {
  mapAnnouncement,
  type Announcement,
  type AnnouncementDraft,
  type AnnouncementRow,
} from "@/lib/announcement";

/** 解析管理员在用户表中的 id（无则 null；公告发布人仅做展示） */
export async function resolveAdminUserId(
  username: string
): Promise<number | null> {
  const { rows } = await query<{ id: number }>(
    "SELECT id FROM wenan_users WHERE nickname = $1",
    [username]
  );
  return rows[0]?.id ?? null;
}

/** 公开可见公告：未隐藏，置顶优先、时间倒序 */
export async function getVisibleAnnouncements(): Promise<Announcement[]> {
  const { rows } = await query<AnnouncementRow>(
    `SELECT a.*, u.nickname AS created_nickname
     FROM wenan_announcements a
     LEFT JOIN wenan_users u ON u.id = a.created_by
     WHERE a.is_hidden = FALSE
     ORDER BY a.is_pinned DESC, a.created_at DESC`
  );
  return rows.map(mapAnnouncement);
}

/** 管理端全量公告（含隐藏），分页 */
export async function getAllAnnouncements(
  page = 1,
  pageSize = 10
): Promise<{ items: Announcement[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const { rows } = await query<AnnouncementRow>(
    `SELECT a.*, u.nickname AS created_nickname
     FROM wenan_announcements a
     LEFT JOIN wenan_users u ON u.id = a.created_by
     ORDER BY a.is_pinned DESC, a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  const { rows: countRows } = await query<{ total: number }>(
    "SELECT COUNT(*) AS total FROM wenan_announcements"
  );
  return {
    items: rows.map(mapAnnouncement),
    total: Number(countRows[0]?.total ?? 0),
  };
}

/** 新建公告 */
export async function createAnnouncement(
  draft: AnnouncementDraft,
  adminUserId: number | null
): Promise<Announcement> {
  const { rows } = await query<AnnouncementRow>(
    `INSERT INTO wenan_announcements (title, content, is_hidden, is_pinned, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      draft.title.trim(),
      draft.content.trim(),
      draft.isHidden,
      draft.isPinned,
      adminUserId,
    ]
  );
  return mapAnnouncement(rows[0]);
}

/** 更新公告（标题/正文/隐藏/置顶） */
export async function updateAnnouncement(
  id: string,
  draft: AnnouncementDraft
): Promise<Announcement | null> {
  const { rows } = await query<AnnouncementRow>(
    `UPDATE wenan_announcements
     SET title = $2, content = $3, is_hidden = $4, is_pinned = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, draft.title.trim(), draft.content.trim(), draft.isHidden, draft.isPinned]
  );
  if (!rows[0]) return null;
  return mapAnnouncement(rows[0]);
}

/** 删除公告（硬删除） */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const { rowCount } = await query<AnnouncementRow>(
    "DELETE FROM wenan_announcements WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}
