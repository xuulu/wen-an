import "server-only";

import { getSiteSettings } from "@/lib/site-settings";

export interface KeywordReviewResult {
  passed: boolean;
  hitKeyword: string;
}

/** 关键词审核：命中屏蔽词即拒绝（标题+正文+标签统一检查） */
export async function reviewByKeywords(
  item: { title: string; content: string; tags?: string[] }
): Promise<KeywordReviewResult> {
  const settings = await getSiteSettings();
  if (settings.review_keyword_enabled !== "true") {
    return { passed: true, hitKeyword: "" };
  }

  const blocked = settings.review_blocked_keywords
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);

  const haystack = `${item.title}\n${item.content}\n${(item.tags ?? []).join(",")}`;
  const hit = blocked.find((word) => haystack.includes(word));
  return hit ? { passed: false, hitKeyword: hit } : { passed: true, hitKeyword: "" };
}
