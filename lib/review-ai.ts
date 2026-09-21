import "server-only";

import { getSiteSettings } from "@/lib/site-settings";

/** AI 机审三态：通过 / 拒绝 / 不确定（转人工） */
export type AIDecision = "approved" | "rejected" | "uncertain";

export interface AIReviewResult {
  decision: AIDecision;
  reason: string;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * AI 审核：调用 OpenAI 兼容 /chat/completions。
 * 要求模型只返回 JSON，passed 取 true / false / "uncertain"。
 * 生产安全原则：任何无法得到确定结论的情况（未配置、网络失败、返回不可解析）
 * 一律返回 uncertain 转人工，绝不默认放行。
 */
export async function reviewByAI(item: {
  title: string;
  content: string;
  tags?: string[];
}): Promise<AIReviewResult> {
  const settings = await getSiteSettings();
  if (settings.review_ai_enabled !== "true") {
    return { decision: "uncertain", reason: "" };
  }
  if (!settings.ai_api_key) {
    return { decision: "uncertain", reason: "AI 审核未配置 API Key，转人工" };
  }

  let res: Response;
  try {
    res = await fetch(`${settings.ai_base_url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.ai_api_key}`,
      },
      body: JSON.stringify({
        model: settings.ai_model,
        messages: [
          { role: "system", content: settings.ai_review_prompt },
          {
            role: "user",
            content: `标题：${item.title}\n正文：${item.content}\n标签：${(item.tags ?? []).join("、") || "无"}`,
          },
        ],
        temperature: 0,
      }),
    });
  } catch {
    return { decision: "uncertain", reason: "AI 服务调用失败，转人工" };
  }

  if (!res.ok) {
    return { decision: "uncertain", reason: `AI 服务返回 ${res.status}，转人工` };
  }

  const data = (await res.json().catch(() => null)) as ChatCompletionResponse | null;
  const content = data?.choices?.[0]?.message?.content ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { decision: "uncertain", reason: "AI 返回无法解析，转人工" };
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    passed?: boolean | string;
    reason?: string;
  };

  const reason = parsed.reason ?? "";
  if (parsed.passed === true) return { decision: "approved", reason };
  if (parsed.passed === false) return { decision: "rejected", reason };
  // passed === "uncertain" 或其他值
  return { decision: "uncertain", reason };
}
