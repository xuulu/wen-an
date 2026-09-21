import "server-only";

import { reviewByKeywords } from "@/lib/review-keyword";
import { reviewByAI, type AIDecision } from "@/lib/review-ai";
import { getSiteSettings } from "@/lib/site-settings";
import { insertReviewLog } from "@/lib/copywriting-data";

export type ReviewDecision = "approved" | "rejected" | "pending";

export interface ReviewOutcome {
  decision: ReviewDecision;
  reason: string;
  method: "keyword" | "ai" | "";
}

function toStatus(decision: AIDecision): ReviewDecision {
  if (decision === "approved") return "approved";
  if (decision === "rejected") return "rejected";
  return "pending";
}

/**
 * 统一机审（投稿与一键审核共用，保证只有一条路径）：
 *   关键词硬规则命中 → rejected
 *   否则交 AI：approved / rejected / uncertain(转人工 pending)
 * 任何机审都得不出确定结论时 → pending 人工，绝不默认放行。
 */
export async function runReview(item: {
  title: string;
  content: string;
  tags?: string[];
  options?: { copyId?: string | number; userId?: number | null };
}): Promise<ReviewOutcome> {
  const { title, content, tags, options } = item;
  const settings = await getSiteSettings();
  const logBase = {
    copyId: options?.copyId,
    copyTitle: title,
    userId: options?.userId ?? null,
  };

  // 1. 关键词硬规则
  if (settings.review_keyword_enabled === "true") {
    const keywordResult = await reviewByKeywords({ title, content, tags });
    if (!keywordResult.passed) {
      const reason = `命中屏蔽词「${keywordResult.hitKeyword}」`;
      await insertReviewLog({
        ...logBase,
        method: "keyword",
        decision: "rejected",
        reason,
      });
      return { decision: "rejected", reason, method: "keyword" };
    }
  }

  // 2. AI 审核
  if (settings.review_ai_enabled === "true") {
    const aiResult = await reviewByAI({ title, content, tags });
    if (aiResult.decision !== "uncertain") {
      await insertReviewLog({
        ...logBase,
        method: "ai",
        decision: aiResult.decision,
        reason: aiResult.reason,
      });
      return {
        decision: toStatus(aiResult.decision),
        reason: aiResult.reason,
        method: "ai",
      };
    }
    // AI 不确定 → 转人工，写日志（decision=pending）并保留原因供人工参考
    await insertReviewLog({
      ...logBase,
      method: "ai",
      decision: "pending",
      reason: aiResult.reason || "AI 无法判定，转人工审核",
    });
    return { decision: "pending", reason: aiResult.reason, method: "ai" };
  }

  // 3. 无机审能给结论（关键词未开/已通过，AI 未开）→ 人工
  return { decision: "pending", reason: "", method: "" };
}
