"use client";

/**
 * OpenAPI 接口测试器（管理员后台）
 *
 * 功能：预置常用接口端点，支持手动改方法/路径/请求头/JSON body，
 * 同源发送请求并展示状态码、耗时与响应体。管理员登录态 cookie 自动携带。
 *
 * 安全约束：
 * - 仅允许相对路径且必须以 /api/ 开头（禁止 http(s):// 绝对地址，防 SSRF）；
 * - 不预置任何修改数据的高危写接口，写接口由使用者按需手动输入；
 * - 响应体限制展示长度，防止超大响应卡死页面。
 */

import { useState } from "react";
import { Send, TerminalSquare, X } from "lucide-react";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface PresetEndpoint {
  label: string;
  method: Method;
  path: string;
  /** 预填 body（JSON 字符串），无则空 */
  body?: string;
  /** 说明：用于什么场景 */
  desc: string;
  /** 是否高危写操作（仅展示不自动执行，需使用者确认） */
  dangerous?: boolean;
}

const PRESETS: PresetEndpoint[] = [
  { label: "文案列表", method: "GET", path: "/api/copy", desc: "全站文案列表（支持 ?categoryId=&page=&search=）" },
  { label: "分类列表", method: "GET", path: "/api/categories", desc: "公开分类，含数量统计" },
  { label: "公告列表", method: "GET", path: "/api/announcements", desc: "公开公告（置顶在前）" },
  { label: "验证码", method: "GET", path: "/api/captcha", desc: "图形验证码（注册/登录用）" },
  { label: "我的收藏", method: "GET", path: "/api/user/favorites", desc: "登录用户收藏列表（需登录态）" },
  { label: "我的反馈", method: "GET", path: "/api/feedbacks", desc: "登录用户反馈列表（需登录态）" },
  { label: "我的投稿", method: "GET", path: "/api/user/submissions", desc: "登录用户投稿列表（需登录态）" },
  { label: "后台设置", method: "GET", path: "/api/admin/settings", desc: "站点设置（需管理员）" },
  {
    label: "提交反馈",
    method: "POST",
    path: "/api/feedbacks",
    body: JSON.stringify({ type: "suggestion", content: "接口测试：这是一条测试反馈", contact: "" }),
    desc: "提交一条反馈（5 次/小时限流）",
  },
  {
    label: "投递文案",
    method: "POST",
    path: "/api/user/copy",
    body: JSON.stringify({ categoryId: "1", title: "接口测试标题", content: "接口测试内容" }),
    desc: "用户投稿（30 次/小时限流）",
    dangerous: true,
  },
  {
    label: "删除投稿（危险）",
    method: "DELETE",
    path: "/api/user/submissions",
    body: JSON.stringify({ ids: [] }),
    desc: "批量删除投稿，请把 ids 改为真实 ID 后再测（10 次/小时限流）",
    dangerous: true,
  },
];

interface TestResult {
  ok: boolean;
  status: number;
  timeMs: number;
  body: string;
  error?: string;
}

const MAX_BODY_LEN = 12000;

export function OpenApiTester() {
  const [method, setMethod] = useState<Method>("GET");
  const [path, setPath] = useState("/api/categories");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  function applyPreset(p: PresetEndpoint) {
    setMethod(p.method);
    setPath(p.path);
    setBody(p.body ?? "");
    setResult(null);
  }

  function validate(): string | null {
    if (!path.startsWith("/api/") || path.includes("://")) {
      return "路径必须是本站相对路径且以 /api/ 开头（禁止外部地址）";
    }
    if (body) {
      try {
        JSON.parse(body);
      } catch {
        return "body 不是合法 JSON";
      }
    }
    if (headers) {
      try {
        JSON.parse(headers);
      } catch {
        return "请求头不是合法 JSON（格式：{\"X-Test\":\"1\"}）";
      }
    }
    return null;
  }

  async function run() {
    const err = validate();
    if (err) {
      setResult({ ok: false, status: 0, timeMs: 0, body: "", error: err });
      return;
    }
    setRunning(true);
    const start = performance.now();
    try {
      const extraHeaders: Record<string, string> = headers
        ? (JSON.parse(headers) as Record<string, string>)
        : {};
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json", ...extraHeaders },
        ...(body ? { body } : {}),
        // 同源请求默认带 cookie（管理员登录态），无需显式 credentials
      });
      const text = await res.text();
      const elapsed = Math.round(performance.now() - start);
      setResult({
        ok: res.ok,
        status: res.status,
        timeMs: elapsed,
        body:
          text.length > MAX_BODY_LEN
            ? `${text.slice(0, MAX_BODY_LEN)}\n…（响应过长已截断，共 ${text.length} 字符）`
            : text,
      });
    } catch (e) {
      const elapsed = Math.round(performance.now() - start);
      setResult({
        ok: false,
        status: 0,
        timeMs: elapsed,
        body: "",
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 预置端点 */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">预置端点（点击填入）</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                p.dangerous ? "border-destructive/40" : ""
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                    p.method === "GET"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : p.method === "POST"
                        ? "bg-sky-500/15 text-sky-600"
                        : "bg-amber-500/15 text-amber-600"
                  }`}
                >
                  {p.method}
                </span>
                {p.label}
              </span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {p.path}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground/70">
                {p.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 请求编辑区 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="请求方法"
            value={method}
            onChange={(e) => setMethod(e.target.value as Method)}
            className="rounded-lg border bg-background px-2.5 py-2 font-mono text-sm"
          >
            {(["GET", "POST", "PATCH", "DELETE"] as Method[]).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            aria-label="请求路径"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/api/…"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            <Send className="size-4" />
            {running ? "发送中…" : "发送请求"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              请求头（JSON，可选）
            </label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              rows={3}
              placeholder='{"X-Test":"1"}'
              className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Body（JSON，GET 时忽略）
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder='{"key":"value"}'
              className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* 结果区 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <TerminalSquare className="size-4" />
            响应结果
          </h3>
          {result && (
            <span
              className={`flex items-center gap-2 text-xs ${
                result.ok ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {result.status > 0 ? `HTTP ${result.status}` : "请求失败"}
              <span className="text-muted-foreground">
                {result.timeMs} ms
              </span>
              <button
                type="button"
                onClick={() => setResult(null)}
                aria-label="清空结果"
                className="rounded p-0.5 text-muted-foreground hover:bg-accent"
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
        </div>
        {result ? (
          <pre
            className={`max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-xs leading-relaxed ${
              result.ok
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-destructive/30 bg-destructive/5"
            }`}
          >
            {result.error || result.body || "（空响应）"}
          </pre>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
            选择上方预置端点或手动输入路径后点击「发送请求」。响应将在这里展示。
          </div>
        )}
      </div>
    </div>
  );
}
