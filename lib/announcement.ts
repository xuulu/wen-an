/** 站务公告 */
export interface Announcement {
  id: string;
  title: string;
  content: string;
  /** 是否隐藏（软隐藏：不展示但保留数据） */
  isHidden: boolean;
  /** 是否置顶（置顶优先展示） */
  isPinned: boolean;
  /** 发布管理员昵称（无则为空） */
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

/** 公告表单（新增/编辑共用） */
export interface AnnouncementDraft {
  title: string;
  content: string;
  isHidden: boolean;
  isPinned: boolean;
}

/** 数据库行（与 pg 查询结果对应，命名风格沿用 db/schema） */
export interface AnnouncementRow {
  id: number | string;
  title: string;
  content: string;
  is_hidden: boolean;
  is_pinned: boolean;
  created_by: number | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_nickname?: string | null;
}

/** 把数据库行规整为前端 Announcement */
export function mapAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    isHidden: !!row.is_hidden,
    isPinned: !!row.is_pinned,
    createdByName: row.created_nickname ?? "",
    createdAt: fmtDateTime(row.created_at),
    updatedAt: fmtDateTime(row.updated_at),
  };
}

/** 时间格式化：YYYY-MM-DD HH:mm（本地时区） */
function fmtDateTime(v: Date | string): string {
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}`;
  }
  return String(v).slice(0, 16).replace("T", " ");
}

/** 校验公告草稿；返回错误消息（合法返回 null） */
export function validateAnnouncementDraft(draft: AnnouncementDraft): string | null {
  const title = draft.title.trim();
  const content = draft.content.trim();
  if (title.length < 2) return "公告标题至少 2 个字";
  if (title.length > 200) return "公告标题不能超过 200 字";
  if (content.length < 5) return "公告正文至少 5 个字";
  if (content.length > 20000) return "公告正文不能超过 20000 字";
  return null;
}
