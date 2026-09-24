"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  Trash2,
  UserX,
} from "lucide-react";

import { DeleteSubmissionsDialog } from "@/components/user/delete-submissions-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MyCopyItem } from "@/lib/copywriting";

/**
 * 危险操作区（账号设置 tab 底部）：
 * 1. 回收站：查看已软删投稿、一键恢复（冷静期内）；
 * 2. 删除我全部投稿：收集全部 id 后走二次验证弹窗；
 * 3. 注销账号：默认「内容保留并匿名化」，密码二次验证，成功后回首页。
 */
export function DangerZone() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <RecycleBin />
      <DeleteAll />
      <DeactivateAccount />
    </div>
  );
}

/* ---------------- 回收站 ---------------- */

interface RecycleResponse {
  items: MyCopyItem[];
  total: number;
  graceDays: number;
}

function RecycleBin() {
  const [data, setData] = useState<RecycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(() => {
    // 不在此处同步 setLoading（会在 effect 内触发级联渲染）；
    // loading 初值为 true，重新加载由调用方先置 loading。
    fetch("/api/user/submissions/recycle?page=1&pageSize=50")
      .then((r) => r.json())
      .then((d: RecycleResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, reload]);

  async function restore(id: string) {
    setRestoring(id);
    try {
      const res = await fetch("/api/user/submissions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string };
        alert(d?.error ?? "恢复失败");
      } else {
        setLoading(true);
        setReload((n) => n + 1);
      }
    } finally {
      setRestoring(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <RotateCcw className="size-4 text-muted-foreground" />
        回收站
        {data && (
          <span className="text-xs font-normal text-muted-foreground">
            （{data.total} 条，{data.graceDays} 天内可恢复）
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          回收站是空的
        </p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm"
            >
              <span className="truncate flex-1">{item.title}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={restoring === item.id}
                onClick={() => restore(item.id)}
              >
                {restoring === item.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RotateCcw />
                )}
                恢复
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- 删除我全部投稿 ---------------- */

function DeleteAll() {
  const [collecting, setCollecting] = useState(false);
  const [allIds, setAllIds] = useState<string[] | null>(null);

  async function collectAndOpen() {
    setCollecting(true);
    try {
      // 分页收集全部投稿 id（pageSize 100 循环，直到取完）
      const ids: string[] = [];
      let page = 1;
      for (;;) {
        const res = await fetch(
          `/api/user/submissions?page=${page}&pageSize=100`
        );
        const d = (await res.json()) as { items: { id: string }[]; total: number };
        ids.push(...d.items.map((i) => i.id));
        if (ids.length >= d.total || d.items.length === 0) break;
        page += 1;
      }
      if (ids.length === 0) {
        alert("你还没有投稿");
      } else {
        setAllIds(ids);
      }
    } finally {
      setCollecting(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Trash2 className="size-4 text-amber-600" />
        删除我全部投稿
      </div>
      <p className="text-sm text-muted-foreground">
        一次性删除你的全部投稿（进入回收站）。被较多人收藏的文案受保护不会删除。
        若你只是想离开，更推荐下方「注销账号」，内容将匿名保留。
      </p>
      <div>
        <Button
          variant="outline"
          className="border-amber-500/50 text-amber-700"
          onClick={collectAndOpen}
          disabled={collecting}
        >
          {collecting && <Loader2 className="animate-spin" />}
          删除全部投稿
        </Button>
      </div>
      <DeleteSubmissionsDialog
        open={allIds !== null}
        ids={allIds ?? []}
        onClose={() => setAllIds(null)}
      />
    </section>
  );
}

/* ---------------- 注销账号 ---------------- */

function DeactivateAccount() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDeactivate() {
    setError("");
    if (!confirm) return setError("请先勾选确认");
    if (!password) return setError("请输入登录密码");
    setBusy(true);
    try {
      const res = await fetch("/api/user/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm: true }),
      });
      const d = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) {
        setError(d?.error ?? "注销失败");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <UserX className="size-4 text-red-600" />
        注销账号
      </div>
      <p className="text-sm text-muted-foreground">
        默认<span className="font-medium">内容保留并匿名化</span>：
        你已发布的投稿会继续留在社区，但作者信息会被移除；待审核/被拒的投稿将被删除。
        注销后账号无法再登录。
      </p>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-muted-foreground">登录密码</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={busy}
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
          disabled={busy}
        />
        我已了解注销后果，并确认注销账号
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div>
        <Button variant="destructive" onClick={handleDeactivate} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          <AlertTriangle />
          确认注销
        </Button>
      </div>
    </section>
  );
}
