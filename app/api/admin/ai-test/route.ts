import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * POST /api/admin/ai-test：测试 AI 接口连通性（管理员专用）
 *
 * 使用后台已保存的 ai_base_url / ai_model / ai_api_key 发一个最小请求：
 *   POST {base}/chat/completions  { model, messages:[{role:"user",content:"ping"}], max_tokens:5 }
 * 返回 HTTP 状态、耗时与模型回复片段；失败时返回可读错误信息，方便排查配置。
 *
 * 安全：
 * - 仅管理员可调用（getAdminUser）；
 * - base_url 必须为 http(s):// 开头（防止 SSRF 到内网地址）；
 * - API Key 仅存在于站点设置（服务端），本接口不返回 Key 本身。
 */
export async function POST() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  const baseUrl = settings.ai_base_url.trim().replace(/\/+$/, "");
  const model = settings.ai_model.trim();
  const apiKey = settings.ai_api_key.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "未配置 API Key，请先在「AI 接口配置」填写并保存" },
      { status: 200 }
    );
  }
  if (!/^https?:\/\/.+/i.test(baseUrl)) {
    return NextResponse.json(
      { ok: false, error: "接口地址（Base URL）不是合法的 http(s) 地址" },
      { status: 200 }
    );
  }
  if (!model) {
    return NextResponse.json(
      { ok: false, error: "未配置模型名称" },
      { status: 200 }
    );
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(15000), // 15s 超时，避免测试卡死
    });
    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        detail = body.error?.message ?? "";
      } catch {
        /* 忽略非 JSON 错误体 */
      }
      return NextResponse.json({
        ok: false,
        status: res.status,
        latencyMs,
        error: detail
          ? `接口返回 ${res.status}：${detail}`
          : `接口返回 ${res.status}（${res.statusText || "无详情"}）`,
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({
      ok: true,
      status: res.status,
      latencyMs,
      reply: reply.slice(0, 200) || "（空回复）",
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const reason =
      err instanceof Error
        ? err.name === "TimeoutError" || /timeout/i.test(err.message)
          ? "请求超时（15s），请检查接口地址与网络"
          : `请求失败：${err.message}`
        : "请求失败（未知错误）";
    return NextResponse.json({
      ok: false,
      latencyMs,
      error: reason,
    });
  }
}
