import { NextResponse } from "next/server";

import { getAdminUser, getCurrentUser } from "@/lib/auth";
import {
  closeMyFeedback,
  createFeedback,
  getAllFeedbacks,
  getMyFeedbacks,
} from "@/lib/feedback-data";
import type { FeedbackType } from "@/lib/feedback";

/**
 * GET：登录用户看自己的反馈；管理员带 ?scope=all 可看全部
 * POST：登录用户提交反馈
 * PATCH：登录用户申请关闭自己的工单，body { id }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const admin = await getAdminUser();
  if (admin && searchParams.get("scope") === "all") {
    const status = searchParams.get("status");
    const page = Number(searchParams.get("page")) || 1;
    const validStatus =
      status === "pending" ||
      status === "replied" ||
      status === "closed" ||
      status === "all"
        ? status
        : "all";
    const result = await getAllFeedbacks(validStatus, page);
    return NextResponse.json(result);
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const items = await getMyFeedbacks(user.id);
  return NextResponse.json({ items, total: items.length });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录后再提交" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    type?: unknown;
    content?: unknown;
    contact?: unknown;
  } | null;

  const type = body?.type;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const contact =
    typeof body?.contact === "string" ? body.contact.trim() : "";

  if (
    type !== "bug" &&
    type !== "suggestion" &&
    type !== "complaint" &&
    type !== "other"
  ) {
    return NextResponse.json({ error: "反馈类型不合法" }, { status: 400 });
  }
  if (content.length < 5) {
    return NextResponse.json(
      { error: "反馈内容至少 5 个字，方便我们了解情况" },
      { status: 400 }
    );
  }
  if (content.length > 1000) {
    return NextResponse.json(
      { error: "反馈内容请控制在 1000 字以内" },
      { status: 400 }
    );
  }

  const item = await createFeedback(user.id, {
    type: type as FeedbackType,
    content,
    contact,
  });
  return NextResponse.json(item, { status: 201 });
}

/** 用户申请关闭自己的工单，body: { id: string } */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "缺少工单 id" }, { status: 400 });
  }

  const ok = await closeMyFeedback(user.id, id);
  if (!ok) {
    return NextResponse.json(
      { error: "工单不存在或已关闭" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
