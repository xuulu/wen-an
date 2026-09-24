import { NextResponse } from "next/server";

import { getVisibleAnnouncements } from "@/lib/announcement-data";

/** 公开公告：未隐藏公告，置顶优先、时间倒序（无需登录，用户中心与站内均可展示） */
export async function GET() {
  const items = await getVisibleAnnouncements();
  return NextResponse.json({ items, total: items.length });
}
