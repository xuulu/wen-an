import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getMyFavorites, removeFavorites } from "@/lib/copywriting-data";

/**
 * 我的收藏：不传 pageSize（或为 0）返回全部；
 * 数据超过 50 条时前端按每页 20 条分页拉取。
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageSize = Number(searchParams.get("pageSize"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  if (pageSize > 0) {
    const result = await getMyFavorites(
      user.id,
      pageSize,
      (page - 1) * pageSize
    );
    return NextResponse.json(result);
  }

  const result = await getMyFavorites(user.id, 0, 0);
  return NextResponse.json(result);
}

/** 批量取消收藏，body: { ids: string[] } */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
  } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .filter((id): id is string => typeof id === "string")
        .map(Number)
        .filter((id) => Number.isInteger(id))
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "未选择任何项" }, { status: 400 });
  }

  const removed = await removeFavorites(user.id, ids);
  return NextResponse.json({ removed });
}
