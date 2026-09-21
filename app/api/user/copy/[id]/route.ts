import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  isOwnedSubmission,
  updateMySubmission,
} from "@/lib/copywriting-data";
import { findSimilarCopy } from "@/lib/similarity";
import { runReview } from "@/lib/review-engine";
import {
  CONTENT_MAX,
  CONTENT_MIN,
  TAG_MAX_COUNT,
  TAG_MAX_LEN,
  TITLE_MAX,
} from "@/lib/batch-import";

/**
 * 用户修改自己的投稿（PUT）：
 * 归属校验 → 相似度拦截（排除自身）→ 统一机审（与投稿同一路径）
 *   机审拒绝 → 返回 400 且不写库，保持原文案与原状态
 *   机审通过 → 更新内容并直接上架
 *   机审不确定 → 更新内容，回到待审核（人工）
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录后再修改" }, { status: 401 });
  }

  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    content?: string;
    categoryId?: string;
    tags?: unknown;
  } | null;

  const title = body?.title?.trim();
  const content = body?.content?.trim();
  const categoryId = body?.categoryId;
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === "string")
    : [];

  if (!title || !content || !categoryId) {
    return NextResponse.json(
      { error: "标题、内容、类目不能为空" },
      { status: 400 }
    );
  }

  // 与批量导入一致的长度限制
  if (title.length > TITLE_MAX) {
    return NextResponse.json({ error: `标题最多 ${TITLE_MAX} 字` }, { status: 400 });
  }
  if (content.length < CONTENT_MIN || content.length > CONTENT_MAX) {
    return NextResponse.json(
      { error: `正文需在 ${CONTENT_MIN}-${CONTENT_MAX} 字之间` },
      { status: 400 }
    );
  }
  if (tags.length > TAG_MAX_COUNT || tags.some((t) => t.length > TAG_MAX_LEN)) {
    return NextResponse.json(
      { error: `标签最多 ${TAG_MAX_COUNT} 个，每个不超过 ${TAG_MAX_LEN} 字` },
      { status: 400 }
    );
  }

  if (!(await isOwnedSubmission(user.id, id))) {
    return NextResponse.json({ error: "投稿不存在" }, { status: 404 });
  }

  const similar = await findSimilarCopy(content, 0.8, id);
  if (similar) {
    return NextResponse.json(
      {
        error: `与已有文案「${similar.title}」相似度过高（${Math.round(
          similar.score * 100
        )}%），请勿重复投稿`,
      },
      { status: 400 }
    );
  }

  // 机审新内容：拒绝则不落库，保持原文案
  const outcome = await runReview({
    title,
    content,
    tags,
    options: { copyId: id, userId: user.id },
  });

  if (outcome.decision === "rejected") {
    return NextResponse.json(
      { error: `修改未通过审核：${outcome.reason}` },
      { status: 400 }
    );
  }

  const ok = await updateMySubmission(user.id, id, {
    title,
    content,
    categoryId,
    tags,
    status: outcome.decision,
  });
  if (!ok) {
    return NextResponse.json({ error: "投稿不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: outcome.decision });
}
