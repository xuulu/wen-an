"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookMarked,
  Home,
  LogOut,
  MessageSquareText,
  PenLine,
  Settings,
} from "lucide-react";

import { FavoritesPanel } from "@/components/user/favorites-panel";
import { FeedbacksPanel } from "@/components/user/feedbacks-panel";
import { SettingsPanel } from "@/components/user/settings-panel";
import { SubmissionsPanel } from "@/components/user/submissions-panel";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/copywriting";

type TabKey = "favorites" | "submissions" | "feedbacks" | "settings";

const TABS: { key: TabKey; label: string; icon: typeof BookMarked }[] = [
  { key: "favorites", label: "我的收藏", icon: BookMarked },
  { key: "submissions", label: "我的投稿", icon: PenLine },
  { key: "feedbacks", label: "意见反馈", icon: MessageSquareText },
  { key: "settings", label: "账号设置", icon: Settings },
];

export function UserDashboard({
  nickname,
  categories,
}: {
  nickname: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("favorites");

  async function handleLogout() {
    await fetch("/api/user/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* 用户信息 */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="h-20 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 sm:h-24" />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <span className="-mt-8 flex size-16 items-center justify-center rounded-full border-4 border-card bg-gradient-to-br from-violet-500 to-rose-500 text-xl font-semibold text-white">
            {nickname.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1 pb-0.5">
            <h1 className="truncate text-lg font-semibold">{nickname}</h1>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => router.push("/")}
            >
              <Home />
              返回首页
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleLogout}
            >
              <LogOut />
              退出
            </Button>
          </div>
        </div>
      </section>

      {/* Tab 切换 */}
      <div className="mt-5 flex gap-1 rounded-xl border bg-card p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* 面板内容 */}
      <section className="mt-4">
        {tab === "favorites" && <FavoritesPanel />}
        {tab === "submissions" && <SubmissionsPanel categories={categories} />}
        {tab === "feedbacks" && <FeedbacksPanel />}
        {tab === "settings" && <SettingsPanel nickname={nickname} />}
      </section>
    </main>
  );
}
