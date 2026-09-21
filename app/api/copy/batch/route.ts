import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  bulkInsertCopyItems,
  getCategories,
} from "@/lib/copywriting-data";
import { findSimilarCopy, similarity } from "@/lib/similarity";
import {
  validateBatchItem,
  type ParsedCopyInput,
} from "@/lib/batch-import";

interface SkippedItem {
  index: number;
  title: string;
  score: number;
  similarTitle: string;
}

/**
 * 仅管理员：批量导入文案（公共文案，直接 approved，条数无限制）
 * 相似度 ≥ 0.8 的条目（与库中已有或本批已采纳条目重复）跳过，不中断整批。
 * body: { categoryId: string; items: ParsedCopyInput[] }
 * 返回: { inserted, skipped, errors }
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { error: "未登录或登录已过期" },
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

  // 校验类目存在
  const categories = await getCategories();
  if (!categories.some((c) => c.id === categoryId)) {
    return NextResponse.json(
      { error: "所选类目不存在" },
      { status: 400 }
    );
  }

  const items = body.items as ParsedCopyInput[];
  // 先全部校验，任一失败整批拒绝
  for (let i = 0; i < items.length; i++) {
    const err = validateBatchItem(items[i], i);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  const skipped: SkippedItem[] = [];
  const accepted: ParsedCopyInput[] = [];
  const acceptedContents: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const content = item.content.trim();

    // 与库中已有文案比对
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

    // 与本批已采纳条目互查，避免一次导入带进重复
    let batchDup: { score: number; title: string } | null = null;
    for (let j = 0; j < acceptedContents.length; j++) {
      const score = similarity(content, acceptedContents[j]);
      if (score >= 0.8) {
        batchDup = { score, title: accepted[j].title };
        break;
      }
    }
    if (batchDup) {
      skipped.push({
        index: i,
        title: item.title.trim(),
        score: batchDup.score,
        similarTitle: batchDup.title,
      });
      continue;
    }

    accepted.push(item);
    acceptedContents.push(content);
  }

  let inserted = 0;
  const errors: { index: number; error: string }[] = [];
  if (accepted.length > 0) {
    try {
      inserted = await bulkInsertCopyItems(categoryId, accepted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 整批写入失败，逐条记入错误（按 accepted 的索引还原原位置）
      accepted.forEach((_, idx) => {
        const origIndex = items.indexOf(accepted[idx]);
        errors.push({ index: origIndex, error: msg });
      });
    }
  }

  return NextResponse.json({ inserted, skipped, errors });
}
