import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRecycleBin } from "@/lib/copywriting-data";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * 回收站：已软删的我的投稿（冷静期内可恢复，到期物理删除）。
 * query: page/pageSize（默认每页 20）；响应附带冷静期天数 graceDays。
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageSize = Math.max(1, Number(searchParams.get("pageSize")) || 20);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [result, settings] = await Promise.all([
    getRecycleBin(user.id, pageSize, (page - 1) * pageSize),
    getSiteSettings(),
  ]);

  return NextResponse.json({
    ...result,
    page,
    pageSize,
    graceDays: Number(settings.deletion_grace_days) || 30,
  });
}
