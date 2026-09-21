"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquareReply,
  Plus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FEEDBACK_TYPES,
  feedbackStatusLabels,
  feedbackStatusStyles,
  feedbackTypeLabels,
  feedbackTypeStyles,
  type Feedback,
  type FeedbackType,
} from "@/lib/feedback";

export function FeedbacksPanel() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedToken, setLoadedToken] = useState<number | null>(null);
  const loading = loadedToken !== reloadToken;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/feedbacks")
      .then((res) => res.json())
      .then((data: { items: Feedback[] }) => {
        if (cancelled) return;
        setFeedbacks(data.items);
        setLoadedToken(reloadToken);
      })
      .catch(() => {
        if (!cancelled) {
          setFeedbacks([]);
          setLoadedToken(reloadToken);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          共 {feedbacks.length} 条反馈
        </p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus />
          提交反馈
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          还没有反馈记录，遇到问题或有建议欢迎告诉我们
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onChanged={() => setReloadToken((t) => t + 1)}
            />
          ))}
        </div>
      )}

      <FeedbackFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSubmitted={() => {
          setSheetOpen(false);
          setReloadToken((t) => t + 1);
        }}
      />
    </div>
  );
}

function FeedbackCard({
  item,
  onChanged,
}: {
  item: Feedback;
  onChanged: () => void;
}) {
  const [closing, setClosing] = useState(false);

  async function handleRequestClose() {
    if (!confirm("确定申请关闭这条反馈工单吗？关闭后如仍有问题请重新提交。")) {
      return;
    }
    setClosing(true);
    try {
      const res = await fetch("/api/feedbacks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "关闭失败");
      }
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "关闭失败，请重试");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-0.5 font-medium ${feedbackTypeStyles[item.type]}`}
        >
          {feedbackTypeLabels[item.type]}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 font-medium ${feedbackStatusStyles[item.status]}`}
        >
          {feedbackStatusLabels[item.status]}
        </span>
        <span className="ml-auto text-muted-foreground">
          {item.createdAt}
        </span>
        {item.status !== "closed" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={closing}
            onClick={handleRequestClose}
          >
            {closing ? <Loader2 className="animate-spin" /> : <X />}
            申请关闭
          </Button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
        {item.content}
      </p>
      {item.adminReply && (
        <div className="mt-3 flex gap-2 rounded-lg bg-primary/5 p-3 text-sm">
          <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <div className="text-xs font-medium text-primary">
              管理员回复
            </div>
            <p className="mt-0.5 whitespace-pre-wrap leading-6">
              {item.adminReply}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackFormSheet({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}) {
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (content.trim().length < 5) {
      setFormError("反馈内容至少 5 个字，方便我们了解情况");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, contact: contact.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "提交失败");
      }
      setType("suggestion");
      setContent("");
      setContact("");
      onSubmitted();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader className="px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 text-white">
                <CheckCircle2 className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <SheetTitle>提交反馈</SheetTitle>
                <SheetDescription>
                  告诉我们遇到的问题或建议，管理员会尽快回复。
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">反馈类型</span>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                      type === value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {feedbackTypeLabels[value]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="feedback-content" className="text-sm font-medium">
                  反馈内容
                </label>
                <span className="text-xs text-muted-foreground">
                  {content.length} 字{content.trim().length < 5 && "（至少 5 字）"}
                </span>
              </div>
              <textarea
                id="feedback-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请详细描述问题或建议（至少 5 个字）"
                rows={6}
                required
                minLength={5}
                maxLength={1000}
                className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="feedback-contact" className="text-sm font-medium">
                联系方式 <span className="text-muted-foreground">（选填）</span>
              </label>
              <Input
                id="feedback-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="邮箱或其他联系方式，方便我们联系你"
                maxLength={100}
              />
            </div>
            {formError && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{formError}</p>
            )}
          </div>

          <SheetFooter className="px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              提交
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
