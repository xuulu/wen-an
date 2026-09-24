"use client";

import { useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  PenLine,
  Settings,
} from "lucide-react";

import { AIReviewManager } from "@/components/admin/ai-review-manager";
import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { CategoryManager } from "@/components/admin/category-manager";
import { CopyManager } from "@/components/admin/copy-manager";
import { FeedbackManager } from "@/components/admin/feedback-manager";
import { SiteSettingsManager } from "@/components/admin/site-settings-manager";
import { StatsOverview } from "@/components/admin/stats-overview";
import type { Category } from "@/lib/copywriting";
import type {
  CategoryDistributionItem,
  OverviewStats,
  RecentUserItem,
  TopContributorItem,
  TopFavoritedItem,
} from "@/lib/copywriting-data";

type TabKey =
  | "overview"
  | "copy"
  | "categories"
  | "feedbacks"
  | "announcements"
  | "ai-review"
  | "settings";

const TABS: { key: TabKey; label: string; icon: typeof PenLine }[] = [
  { key: "overview", label: "数据概览", icon: BarChart3 },
  { key: "copy", label: "文案管理", icon: PenLine },
  { key: "categories", label: "类目管理", icon: LayoutGrid },
  { key: "feedbacks", label: "反馈管理", icon: MessageSquareText },
  { key: "announcements", label: "公告管理", icon: Megaphone },
  { key: "ai-review", label: "AI 审核", icon: BrainCircuit },
  { key: "settings", label: "站点设置", icon: Settings },
];

interface AdminPanelTabsProps {
  categories: Category[];
  stats: OverviewStats;
  topFavorited: TopFavoritedItem[];
  categoryDist: CategoryDistributionItem[];
  topContributors: TopContributorItem[];
  recentUsers: RecentUserItem[];
}

export function AdminPanelTabs({
  categories,
  stats,
  topFavorited,
  categoryDist,
  topContributors,
  recentUsers,
}: AdminPanelTabsProps) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full gap-1 rounded-xl border bg-card p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-3.5 ${
              tab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <StatsOverview
          stats={stats}
          topFavorited={topFavorited}
          categoryDist={categoryDist}
          topContributors={topContributors}
          recentUsers={recentUsers}
        />
      )}
      {tab === "copy" && <CopyManager categories={categories} />}
      {tab === "categories" && <CategoryManager categories={categories} />}
      {tab === "feedbacks" && <FeedbackManager />}
      {tab === "announcements" && <AnnouncementManager />}
      {tab === "ai-review" && <AIReviewManager />}
      {tab === "settings" && <SiteSettingsManager />}
    </div>
  );
}
