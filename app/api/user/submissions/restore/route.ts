import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { restoreMySubmissions } from "@/lib/copywriting-data";

/**
 * 从回收站恢复自己的投稿。
 * body: { ids: string[] }；归属校验在数据层 WHERE 内，防越权。
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .filter((id): id is string => typeof id === "string")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "未选择任何项" }, { status: 400 });
  }

  const restored = await restoreMySubmissions(user.id, ids);
  return NextResponse.json({ restored });
}
