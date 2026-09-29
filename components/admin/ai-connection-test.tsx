"use client";

/**
 * AI 接口连接测试（管理员后台 · AI 接口配置区）
 *
 * 点击「测试连接」调用 POST /api/admin/ai-test（服务端用已保存的
 * base_url / model / api_key 发最小请求），展示状态码、耗时与回复片段。
 * 配置改动未保存时给出提示（测试基于已保存配置）。
 */

import { useState } from "react";
import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TestState {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  reply?: string;
  error?: string;
}

export function AiConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestState | null>(null);

  async function run() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ai-test", { method: "POST" });
      const data = (await res.json()) as TestState;
      setResult(data);
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "请求失败（网络错误）",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={run} disabled={testing}>
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <PlugZap className="size-3.5" />
          )}
          {testing ? "测试中…" : "测试连接"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          基于已保存的配置测试，修改后请先保存再测试
        </span>
      </div>

      {result && (
        <div
          className={`mt-2 flex items-start gap-2 rounded-md border p-2.5 text-xs ${
            result.ok
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 size-3.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            {result.ok ? (
              <>
                <p>
                  连接成功 · HTTP {result.status} · {result.latencyMs} ms
                </p>
                <p className="mt-1 break-all opacity-80">模型回复：{result.reply}</p>
              </>
            ) : (
              <p className="break-all">
                {result.error}
                {typeof result.status === "number"
                  ? `（HTTP ${result.status} · ${result.latencyMs} ms）`
                  : result.latencyMs
                    ? `（${result.latencyMs} ms）`
                    : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
