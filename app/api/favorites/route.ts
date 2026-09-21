import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { copyId } = (await request.json().catch(() => null)) as {
    copyId?: string;
  };
  if (!copyId) {
    return NextResponse.json({ error: "缺少 copyId" }, { status: 400 });
  }

  const id = Number(copyId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "copyId 不合法" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO wenan_user_favorites (user_id, copy_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, copy_id) DO NOTHING`,
    [user.id, id]
  );

  return NextResponse.json({ favorite: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const copyId = searchParams.get("copyId");
  if (!copyId) {
    return NextResponse.json({ error: "缺少 copyId" }, { status: 400 });
  }

  const id = Number(copyId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "copyId 不合法" }, { status: 400 });
  }

  await pool.query(
    `DELETE FROM wenan_user_favorites WHERE user_id = $1 AND copy_id = $2`,
    [user.id, id]
  );

  return NextResponse.json({ favorite: false });
}
