"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Megaphone,
  MessageSquareText,
  Pin,
} from "lucide-react";

import { FeedbacksPanel } from "@/components/user/feedbacks-panel";
import type { Announcement } from "@/lib/announcement";

type SubTab = "announcements" | "feedbacks";

/** 公告列表（用户可读，未隐藏、置顶优先） */
function AnnouncementsView() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data: { items: Announcement[] }) => {
        if (alive) setItems(data.items);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        公告加载失败，请稍后重试
      </div>
    );
  }
  if (!items) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        加载公告中…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        暂无公告
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {items.map((item) => (
        <article key={item.id} className="flex flex-col gap-1.5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {item.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                <Pin className="size-3" />
                置顶
              </span>
            )}
            <h3 className="font-medium">{item.title}</h3>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {item.content}
          </p>
          <p className="font-mono text-xs text-muted-foreground/60">
            {item.createdAt}
          </p>
        </article>
      ))}
    </div>
  );
}

/** 用户中心反馈中心：子 tab = 公告 / 反馈 */
export function FeedbackCenter() {
  const [sub, setSub] = useState<SubTab>("announcements");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full gap-1 self-start rounded-lg border bg-card p-1">
        <button
          type="button"
          onClick={() => setSub("announcements")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            sub === "announcements"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Megaphone className="size-4" />
          公告
        </button>
        <button
          type="button"
          onClick={() => setSub("feedbacks")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            sub === "feedbacks"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <MessageSquareText className="size-4" />
          反馈
        </button>
      </div>

      {sub === "announcements" ? <AnnouncementsView /> : <FeedbacksPanel />}
    </div>
  );
}
