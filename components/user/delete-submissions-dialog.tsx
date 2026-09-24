"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 批量软删投稿确认弹窗（二次验证）。
 *
 * - 要求输入登录密码 + 勾选确认，调用 DELETE /api/user/submissions；
 * - 受社区保护（被收藏达阈值）的文案不会删除，结果中明确提示；
 * - 成功（202）后任务在服务端异步分批执行，短暂延迟后回调 onDone 刷新。
 */
export function DeleteSubmissionsDialog({
  open,
  ids,
  onClose,
  onDone,
}: {
  open: boolean;
  ids: string[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [protectedCount, setProtectedCount] = useState<number | null>(null);

  // 重置表单（事件处理路径调用，不在 effect 内同步 setState）
  function reset() {
    setPassword("");
    setConfirm(false);
    setBusy(false);
    setError("");
    setProtectedCount(null);
  }
  function close() {
    reset();
    onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) close();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  if (!open) return null;

  async function handleSubmit() {
    setError("");
    if (!confirm) {
      setError("请先勾选确认");
      return;
    }
    if (!password) {
      setError("请输入登录密码");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, password, confirm: true }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        scheduled?: number;
        protected?: { id: string }[];
      };
      if (!res.ok) {
        setError(data?.error ?? "删除失败");
        setBusy(false);
        return;
      }
      setProtectedCount(data.protected?.length ?? 0);
      // 给服务端 after() 分批处理一点时间
      setTimeout(() => {
        onDone?.();
        close();
      }, 700);
    } catch {
      setError("网络错误，请重试");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !busy && close()}
      role="dialog"
      aria-modal="true"
      aria-label="删除投稿确认"
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-5 text-amber-500" />
          删除 {ids.length} 条投稿
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          删除后文案进入<span className="font-medium">回收站</span>，
          冷静期内可在「账号设置 → 危险操作」中恢复；过期后将被永久删除。
          被较多用户收藏的文案受社区保护、不会被删除。
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <label htmlFor="del-password" className="text-xs text-muted-foreground">
            登录密码（二次验证）
          </label>
          <Input
            id="del-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={busy}
          />
        </div>

        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
            disabled={busy}
          />
          我已知晓删除影响，并确认删除选中的 {ids.length} 条投稿
        </label>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {protectedCount !== null && protectedCount > 0 && (
          <p className="mt-3 text-sm text-amber-600">
            其中 {protectedCount} 条因被较多人收藏而受保护，未删除。
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={busy}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
