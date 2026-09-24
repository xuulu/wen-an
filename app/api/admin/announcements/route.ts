import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import {
  createAnnouncement,
  getAllAnnouncements,
  resolveAdminUserId,
} from "@/lib/announcement-data";
import {
  validateAnnouncementDraft,
  type AnnouncementDraft,
} from "@/lib/announcement";

/** 管理员：公告列表（含隐藏，分页） */
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;
  const result = await getAllAnnouncements(page, pageSize);
  return NextResponse.json(result);
}

/** 管理员：新建公告 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | (Partial<AnnouncementDraft> & { title?: unknown; content?: unknown })
    | null;

  const draft: AnnouncementDraft = {
    title: typeof body?.title === "string" ? body.title : "",
    content: typeof body?.content === "string" ? body.content : "",
    isHidden: body?.isHidden === true,
    isPinned: body?.isPinned === true,
  };

  const error = validateAnnouncementDraft(draft);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  // 管理员可能同时是普通用户（如 qvqa），尽量关联上用户 id 以便展示发布人
  const adminUserId = await resolveAdminUserId(admin.username);
  const item = await createAnnouncement(draft, adminUserId);
  return NextResponse.json({ item });
}
