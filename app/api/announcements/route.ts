import { NextResponse } from "next/server";

import { getVisibleAnnouncements } from "@/lib/announcement-data";

/** 公开公告：未隐藏公告，置顶优先、时间倒序（无需登录，用户中心与站内均可展示） */
export async function GET() {
  const items = await getVisibleAnnouncements();
  // 公开只读：公告更新不频繁，浏览器/CDN 各缓存 5 分钟
  return NextResponse.json(
    { items, total: items.length },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    }
  );
}
