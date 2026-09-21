import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { closeFeedback, deleteFeedback, replyFeedback } from "@/lib/feedback-data";

/**
 * 仅管理员。
 * PATCH body { reply }：回复反馈；body { action: "close" }：关闭工单
 */
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
    reply?: unknown;
    action?: unknown;
  } | null;

  if (body?.action === "close") {
    const ok = await closeFeedback(id);
    if (!ok) {
      return NextResponse.json(
        { error: "反馈不存在或已关闭" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const reply = typeof body?.reply === "string" ? body.reply.trim() : "";

  if (reply.length < 1) {
    return NextResponse.json({ error: "回复内容不能为空" }, { status: 400 });
  }
  if (reply.length > 1000) {
    return NextResponse.json(
      { error: "回复内容请控制在 1000 字以内" },
      { status: 400 }
    );
  }

  const item = await replyFeedback(id, reply);
  if (!item) {
    return NextResponse.json({ error: "反馈不存在" }, { status: 404 });
  }
  return NextResponse.json(item);
}

/** 仅管理员：删除工单 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteFeedback(id);
  if (!ok) {
    return NextResponse.json({ error: "反馈不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
