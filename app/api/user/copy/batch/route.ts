import { NextResponse } from "next/server";
import { getCurrentUser, getUserBatchCooldownSeconds } from "@/lib/auth";
import { createCopyItem, getCategories } from "@/lib/copywriting-data";
import { findSimilarCopy } from "@/lib/similarity";
import {
  getUserBatchRetryAfter,
  markUserBatchDone,
} from "@/lib/batch-throttle";
import {
  validateBatchItem,
  type ParsedCopyInput,
} from "@/lib/batch-import";

/** 用户批量投稿单次上限 */
const MAX_ITEMS = 500;

interface SkippedItem {
  index: number;
  title: string;
  score: number;
  similarTitle: string;
}

/**
 * 用户批量投稿：每条进入待审核，相似度 ≥ 0.8 的条目跳过继续。
 * body: { categoryId: string; items: ParsedCopyInput[] }
 * 返回: { inserted: number; skipped: SkippedItem[]; errors: { index, error }[] }
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "请先登录后再投稿" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    categoryId?: string;
    items?: unknown;
  } | null;

  const categoryId = body?.categoryId?.trim();
  if (!categoryId) {
    return NextResponse.json(
      { error: "请选择类目" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "导入内容不能为空" },
      { status: 400 }
    );
  }

  // 冷却拦截：成功批量投稿后一段时间内禁止再次投稿
  const retryAfter = getUserBatchRetryAfter(
    user.id,
    getUserBatchCooldownSeconds() * 1000
  );
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: `操作过于频繁，请 ${retryAfter} 秒后再试`, retryAfter },
      { status: 429 }
    );
  }

  if (body.items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `单次最多投稿 ${MAX_ITEMS} 条，当前 ${body.items.length} 条` },
      { status: 400 }
    );
  }

  // 校验类目存在
  const categories = await getCategories();
  if (!categories.some((c) => c.id === categoryId)) {
    return NextResponse.json(
      { error: "所选类目不存在" },
      { status: 400 }
    );
  }

  const items = body.items as ParsedCopyInput[];
  for (let i = 0; i < items.length; i++) {
    const err = validateBatchItem(items[i], i);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  const skipped: SkippedItem[] = [];
  const errors: { index: number; error: string }[] = [];
  let inserted = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const content = item.content.trim();
    try {
      const similar = await findSimilarCopy(content);
      if (similar) {
        skipped.push({
          index: i,
          title: item.title.trim(),
          score: similar.score,
          similarTitle: similar.title,
        });
        continue;
      }
      await createCopyItem(
        {
          title: item.title.trim(),
          content,
          categoryId,
        },
        { userId: user.id, status: "pending", createdAtRaw: item.createdAt }
      );
      inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ index: i, error: msg });
    }
  }

  // 只要有成功入库就进入冷却
  if (inserted > 0) markUserBatchDone(user.id);

  return NextResponse.json({ inserted, skipped, errors });
}
