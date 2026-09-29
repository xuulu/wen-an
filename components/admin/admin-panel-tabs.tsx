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

/** 一级 tab */
type TabKey = "overview" | "copy" | "station" | "settings";

/** 「文案管理」下的二级 tab */
type CopySubTab = "copy" | "categories" | "ai-review";

/** 「公告反馈」下的二级 tab */
type StationSubTab = "announcements" | "feedbacks";

const TABS: { key: TabKey; label: string; icon: typeof PenLine }[] = [
  { key: "overview", label: "数据概览", icon: BarChart3 },
  { key: "copy", label: "文案管理", icon: PenLine },
  { key: "station", label: "公告反馈", icon: Megaphone },
  { key: "settings", label: "站点设置", icon: Settings },
];

const COPY_SUB_TABS: { key: CopySubTab; label: string; icon: typeof PenLine }[] = [
  { key: "copy", label: "文案管理", icon: PenLine },
  { key: "categories", label: "类目管理", icon: LayoutGrid },
  { key: "ai-review", label: "AI 审核", icon: BrainCircuit },
];

const STATION_SUB_TABS: { key: StationSubTab; label: string; icon: typeof PenLine }[] = [
  { key: "announcements", label: "公告", icon: Megaphone },
  { key: "feedbacks", label: "反馈", icon: MessageSquareText },
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
  const [copySub, setCopySub] = useState<CopySubTab>("copy");
  const [stationSub, setStationSub] = useState<StationSubTab>("announcements");

  /** 二级 tab 分隔线样式 */
  function subTabsBar(
    active: string,
    options: { key: string; label: string; icon: typeof PenLine }[],
    onSelect: (key: string) => void
  ) {
    return (
      <div className="flex w-fit max-w-full gap-1 self-start overflow-x-auto rounded-lg border bg-background p-1">
        {options.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 一级 tab */}
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

      {/* 数据概览 */}
      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          <StatsOverview
            stats={stats}
            topFavorited={topFavorited}
            categoryDist={categoryDist}
            topContributors={topContributors}
            recentUsers={recentUsers}
          />
          {/* 公告系统在首 tab 页保留快捷入口（完整管理在「公告反馈」tab） */}
          <AnnouncementManager />
        </div>
      )}

      {/* 文案管理（二级：文案 / 类目 / AI 审核） */}
      {tab === "copy" && (
        <div className="flex flex-col gap-4">
          {subTabsBar(copySub, COPY_SUB_TABS, (k) => setCopySub(k as CopySubTab))}
          {copySub === "copy" && <CopyManager categories={categories} />}
          {copySub === "categories" && <CategoryManager categories={categories} />}
          {copySub === "ai-review" && <AIReviewManager />}
        </div>
      )}

      {/* 公告反馈（二级：公告 / 反馈） */}
      {tab === "station" && (
        <div className="flex flex-col gap-4">
          {subTabsBar(stationSub, STATION_SUB_TABS, (k) =>
            setStationSub(k as StationSubTab)
          )}
          {stationSub === "announcements" && <AnnouncementManager />}
          {stationSub === "feedbacks" && <FeedbackManager />}
        </div>
      )}

      {tab === "settings" && <SiteSettingsManager />}
    </div>
  );
}
