import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { getReviewLogs } from "@/lib/copywriting-data";

/** 管理员：读取最近审核日志（AI/关键词审核记录） */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const logs = await getReviewLogs(50);
  return NextResponse.json({ logs });
}
