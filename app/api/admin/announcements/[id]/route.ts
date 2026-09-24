import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import {
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/announcement-data";
import {
  validateAnnouncementDraft,
  type AnnouncementDraft,
} from "@/lib/announcement";

type Params = { params: Promise<{ id: string }> };

/** 管理员：更新公告（标题/正文/隐藏/置顶） */
export async function PUT(request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { id } = await params;

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

  const item = await updateAnnouncement(id, draft);
  if (!item) {
    return NextResponse.json({ error: "公告不存在" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

/** 管理员：删除公告 */
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteAnnouncement(id);
  if (!ok) {
    return NextResponse.json({ error: "公告不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
