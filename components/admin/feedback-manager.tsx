"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Send,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  feedbackStatusLabels,
  feedbackTypeLabels,
  feedbackTypeStyles,
  type Feedback,
  type FeedbackStatus,
} from "@/lib/feedback";

const PAGE_SIZE = 10;

type StatusFilter = "all" | FeedbackStatus;

const statusFilters: StatusFilter[] = [
  "pending",
  "all",
  "replied",
  "closed",
];

export function FeedbackManager() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const requestKey = `${page}:${reloadToken}:${statusFilter}`;
  const loading = loadedKey !== requestKey;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      scope: "all",
      status: statusFilter,
      page: String(page),
    });
    fetch(`/api/feedbacks?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { items: Feedback[]; total: number }) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken, statusFilter, requestKey]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h2 className="font-semibold">反馈管理</h2>
        <p className="text-sm text-muted-foreground">
          共 {total} 条，查看用户反馈并回复
        </p>
      </div>

      <div className="flex shrink-0 gap-1 self-start rounded-lg border bg-muted/40 p-1">
        {statusFilters.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setStatusFilter(value);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {value === "all" ? "全部" : feedbackStatusLabels[value]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          没有符合条件的反馈
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onChanged={() => setReloadToken((t) => t + 1)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft />
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
            <ChevronRight />
          </Button>
        </div>
      )}
    </section>
  );
}

function FeedbackCard({
  item,
  onChanged,
}: {
  item: Feedback;
  onChanged: () => void;
}) {
  const [reply, setReply] = useState(item.adminReply);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);

  async function handleSubmit() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/feedbacks/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: reply.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "回复失败");
      }
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "回复失败，请重试");
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    if (!confirm(`确定关闭这条工单吗？`)) return;
    setActing(true);
    try {
      const res = await fetch(`/api/feedbacks/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "关闭失败");
      }
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "关闭失败，请重试");
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`确定删除这条工单吗？删除后不可恢复。`)) return;
    setActing(true);
    try {
      const res = await fetch(`/api/feedbacks/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "删除失败");
      }
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败，请重试");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-0.5 font-medium ${feedbackTypeStyles[item.type]}`}
        >
          {feedbackTypeLabels[item.type]}
        </span>
        <span className="font-medium">@{item.username}</span>
        <span className="text-muted-foreground">{item.createdAt}</span>
        {item.contact && (
          <a
            href={
              item.contact.includes("@") ? `mailto:${item.contact}` : undefined
            }
            className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Mail className="size-3" />
            {item.contact}
          </a>
        )}
        <div
          className={`flex items-center gap-1 ${item.contact ? "" : "ml-auto"}`}
        >
          {item.status !== "closed" && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="关闭工单"
              disabled={acting}
              onClick={handleClose}
            >
              <Ban className="text-amber-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="删除工单"
            disabled={acting}
            onClick={handleDelete}
          >
            <Trash2 className="text-rose-600" />
          </Button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
        {item.content}
      </p>
      {item.adminReply && (
        <p className="mt-2 rounded-md bg-primary/5 p-2.5 text-xs leading-5 text-muted-foreground">
          上次回复：{item.adminReply}
        </p>
      )}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={2}
          placeholder="输入回复内容…"
          className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button
          size="sm"
          disabled={!reply.trim() || sending}
          onClick={handleSubmit}
        >
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          回复
        </Button>
      </div>
    </div>
  );
}
