import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { findDuplicateGroups } from "@/lib/similarity";

/** 仅管理员：检测库中重复文案（相似度 ≥ 0.8 的分组） */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const groups = await findDuplicateGroups();
  return NextResponse.json({ groups });
}
