import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createCategory, getCategories } from "@/lib/copywriting-data";
import { isValidHexColor } from "@/lib/copywriting";

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

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

  const category = await createCategory({ label, color, sortOrder });
  return NextResponse.json(category, { status: 201 });
}
