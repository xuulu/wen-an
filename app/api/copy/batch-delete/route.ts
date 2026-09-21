import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { deleteCopyItemsBatch } from "@/lib/copywriting-data";

/**
 * 仅管理员：批量删除文案
 * body: { ids: string[] }
 * 返回: { deleted: number }
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
  } | null;

  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "请选择要删除的文案" }, { status: 400 });
  }

  const deleted = await deleteCopyItemsBatch(ids);
  return NextResponse.json({ deleted });
}
