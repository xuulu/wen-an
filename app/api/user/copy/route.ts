import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCopyItem, setCopyItemStatus } from "@/lib/copywriting-data";
import { findSimilarCopy } from "@/lib/similarity";
import { runReview } from "@/lib/review-engine";
import { rateLimit } from "@/lib/rate-limit";
import {
  CONTENT_MAX,
  CONTENT_MIN,
  TAG_MAX_COUNT,
  TAG_MAX_LEN,
  TITLE_MAX,
} from "@/lib/batch-import";

/**
 * 用户投稿统一流程：
 * 落库 pending → 相似度拦截（前置）→ 统一机审（关键词+AI）
 *   机审确定通过 → approved 自动上架
 *   机审确定违规 → rejected 自动拒绝并返回原因
 *   机审不确定   → 保持 pending 转人工
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录后再投稿" }, { status: 401 });
  }

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

  // 与批量导入一致的长度限制，防止超大内容刷库/刷 AI 审核成本
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

  // 每用户限流，防止刷投稿
  const limited = rateLimit(`user-copy:${user.id}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `投稿过于频繁，请 ${limited.retryAfter} 秒后再试` },
      { status: 429 }
    );
  }

  const similar = await findSimilarCopy(content);
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

  const item = await createCopyItem(
    { title, content, categoryId, tags },
    { userId: user.id, status: "pending" }
  );

  // 统一机审
  const outcome = await runReview({
    title,
    content,
    tags,
    options: { copyId: item.id, userId: user.id },
  });

  if (outcome.decision !== "pending") {
    const updated = await setCopyItemStatus(
      item.id,
      outcome.decision,
      outcome.decision === "rejected" ? outcome.reason : ""
    );
    return NextResponse.json(
      { ...(updated ?? item), reviewReason: outcome.reason },
      { status: 201 }
    );
  }

  return NextResponse.json(item, { status: 201 });
}
