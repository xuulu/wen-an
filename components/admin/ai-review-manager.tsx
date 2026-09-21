"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  HelpCircle,
  Loader2,
  ScrollText,
  Settings2,
  Wand2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsMap = Record<string, string>;

interface ReviewLog {
  id: string;
  copyTitle: string;
  method: string;
  decision: string;
  reason: string;
  createdAt: string;
}

function TextareaField({
  rows = 2,
  value,
  onChange,
}: {
  rows?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-accent"
    >
      <span>{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-cyan-500" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

type SubTab = "logs" | "config";

export function AIReviewManager() {
  const [subTab, setSubTab] = useState<SubTab>("logs");
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected" | "pending">("all");
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [tip, setTip] = useState("");
  const [error, setError] = useState("");

  function loadLogs() {
    fetch("/api/admin/review-logs")
      .then((res) => res.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => undefined);
  }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings))
      .catch(() => setError("设置加载失败"));
    loadLogs();
  }, []);

  function set(key: string, value: string) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSettings(data.settings);
      setTip("已保存并生效");
      setTimeout(() => setTip(""), 2000);
    } else setError(data.error ?? "保存失败");
  }

  async function handleReviewAll() {
    setReviewing(true);
    setError("");
    const res = await fetch("/api/admin/review-all", { method: "POST" });
    const data = await res.json();
    setReviewing(false);
    if (res.ok) {
      alert(`审核完成：通过 ${data.approved} 条，拒绝 ${data.rejected} 条，共 ${data.total} 条`);
      loadLogs();
    } else setError(data.error ?? "审核失败");
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        加载中...
      </div>
    );
  }

  const filteredLogs = logs.filter((log) =>
    filter === "all" ? true : log.decision === filter
  );
  const successCount = logs.filter((l) => l.decision === "approved").length;
  const failCount = logs.filter((l) => l.decision === "rejected").length;
  const pendingCount = logs.filter((l) => l.decision === "pending").length;

  return (
    <div className="flex flex-col gap-4">
      {/* 二级 tab */}
      <div className="flex items-center justify-between">
        <div className="flex overflow-hidden rounded-lg border">
          <button
            type="button"
            onClick={() => setSubTab("logs")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
              subTab === "logs" ? "bg-foreground text-background" : "hover:bg-accent"
            }`}
          >
            <ScrollText className="size-4" />
            审核日志
          </button>
          <button
            type="button"
            onClick={() => setSubTab("config")}
            className={`flex items-center gap-1.5 border-l px-4 py-2 text-sm transition-colors ${
              subTab === "config" ? "bg-foreground text-background" : "hover:bg-accent"
            }`}
          >
            <Settings2 className="size-4" />
            审核配置
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReviewAll}
            disabled={reviewing}
          >
            {reviewing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            一键审核
          </Button>
          {subTab === "config" && (
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              保存设置
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {tip && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
          {tip}
        </p>
      )}

      {subTab === "logs" && (
        <section className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">审核记录</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                通过 {successCount}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="size-3.5" />
                拒绝 {failCount}
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <HelpCircle className="size-3.5" />
                转人工 {pendingCount}
              </span>
              <div className="flex overflow-hidden rounded-md border">
                {(
                  [
                    { key: "all", label: "全部" },
                    { key: "approved", label: "通过" },
                    { key: "rejected", label: "拒绝" },
                    { key: "pending", label: "转人工" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className={`px-2.5 py-1 text-xs transition-colors ${
                      filter === opt.key
                        ? "bg-foreground text-background"
                        : "hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">暂无审核记录</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">时间</th>
                    <th className="py-2 pr-3 font-medium">文案</th>
                    <th className="py-2 pr-3 font-medium">方式</th>
                    <th className="py-2 pr-3 font-medium">结果</th>
                    <th className="py-2 font-medium">原因</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                        {log.createdAt}
                      </td>
                      <td className="py-2 pr-3 max-w-[180px] truncate">
                        {log.copyTitle}
                      </td>
                      <td className="py-2 pr-3">
                        {log.method === "ai"
                          ? "AI"
                          : log.method === "keyword"
                            ? "关键词"
                            : log.method}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            log.decision === "rejected"
                              ? "text-red-600"
                              : log.decision === "pending"
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }
                        >
                          {log.decision === "rejected"
                            ? "拒绝"
                            : log.decision === "pending"
                              ? "转人工"
                              : "通过"}
                        </span>
                      </td>
                      <td className="py-2 max-w-[240px] truncate text-muted-foreground">
                        {log.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {subTab === "config" && (
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">审核规则</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              所有投稿统一执行机审：关键词规则与 AI 审核；无法判定时转人工审核
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Toggle
                label="启用关键词审核（命中屏蔽词自动拒绝）"
                checked={settings.review_keyword_enabled === "true"}
                onChange={(v) => set("review_keyword_enabled", String(v))}
              />
              <Toggle
                label="启用 AI 审核"
                checked={settings.review_ai_enabled === "true"}
                onChange={(v) => set("review_ai_enabled", String(v))}
              />
              <Field label="屏蔽关键词（英文逗号分隔）">
                <TextareaField
                  rows={2}
                  value={settings.review_blocked_keywords}
                  onChange={(v) => set("review_blocked_keywords", v)}
                />
              </Field>
              <Field label="审核日志保留条数（超出自动清理最旧记录，默认 1000）">
                <Input
                  type="number"
                  min={1}
                  value={settings.review_log_retention}
                  onChange={(e) => set("review_log_retention", e.target.value)}
                  className="w-48"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">AI 接口配置（OpenAI 兼容）</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              兼容 OpenAI、DeepSeek、通义等服务
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="接口地址（Base URL）">
                  <Input
                    value={settings.ai_base_url}
                    onChange={(e) => set("ai_base_url", e.target.value)}
                  />
                </Field>
                <Field label="模型名称">
                  <Input
                    value={settings.ai_model}
                    onChange={(e) => set("ai_model", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="API Key（仅服务端使用，不会暴露到浏览器）">
                <Input
                  type="password"
                  value={settings.ai_api_key}
                  onChange={(e) => set("ai_api_key", e.target.value)}
                />
              </Field>
              <Field label="AI 审核提示词（模型按此判定，需要求只返回 passed/reason JSON）">
                <TextareaField
                  rows={6}
                  value={settings.ai_review_prompt}
                  onChange={(v) => set("ai_review_prompt", v)}
                />
              </Field>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
