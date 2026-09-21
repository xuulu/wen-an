import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/copywriting-data";
import { isValidHexColor } from "@/lib/copywriting";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    label?: unknown;
    color?: unknown;
    sortOrder?: unknown;
  } | null;

  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const color = typeof body?.color === "string" ? body.color.trim() : "";
  const sortOrder =
    typeof body?.sortOrder === "number" ? Math.floor(body.sortOrder) : 0;

  if (!label) {
    return NextResponse.json({ error: "类目名称不能为空" }, { status: 400 });
  }
  if (!isValidHexColor(color)) {
    return NextResponse.json(
      { error: "配色必须是 #RRGGBB 六位十六进制颜色码" },
      { status: 400 }
    );
  }

  const category = await updateCategory(id, { label, color, sortOrder });
  if (!category) {
    return NextResponse.json({ error: "类目不存在" }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const { ok, itemCount } = await deleteCategory(id);
  if (!ok && itemCount > 0) {
    return NextResponse.json(
      { error: `该类目下还有 ${itemCount} 条文案，请先移走或删除` },
      { status: 400 }
    );
  }
  if (!ok) {
    return NextResponse.json({ error: "类目不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
