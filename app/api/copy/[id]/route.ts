import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  deleteCopyItem,
  setCopyItemStatus,
  updateCopyItem,
} from "@/lib/copywriting-data";
import type { CopyStatus } from "@/lib/copywriting";

/** 仅管理员：审核文案（通过/拒绝） */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
    reason?: unknown;
  } | null;

  const status = body?.status;
  if (
    status !== "approved" &&
    status !== "rejected" &&
    status !== "pending"
  ) {
    return NextResponse.json({ error: "status 不合法" }, { status: 400 });
  }

  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const item = await setCopyItemStatus(
    id,
    status as CopyStatus,
    status === "rejected" ? reason : ""
  );
  if (!item) {
    return NextResponse.json({ error: "文案不存在" }, { status: 404 });
  }
  return NextResponse.json(item);
}

/** 仅管理员：更新文案（可修改所有文案） */
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
    title?: string;
    content?: string;
    categoryId?: string;
  } | null;

  const title = body?.title?.trim();
  const content = body?.content?.trim();
  const categoryId = body?.categoryId;

  if (!title || !content || !categoryId) {
    return NextResponse.json(
      { error: "标题、内容、类目不能为空" },
      { status: 400 }
    );
  }

  const item = await updateCopyItem(id, { title, content, categoryId });
  if (!item) {
    return NextResponse.json({ error: "文案不存在" }, { status: 404 });
  }
  return NextResponse.json(item);
}

/** 仅管理员：删除文案 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteCopyItem(id);
  if (!ok) {
    return NextResponse.json({ error: "文案不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
