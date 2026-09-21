"use client";

import {
  CheckCircle2,
  EyeOff,
  FileText,
  FolderTree,
  Heart,
  MessageSquareWarning,
  Users,
  XCircle,
} from "lucide-react";

import {
  type CategoryDistributionItem,
  type OverviewStats,
  type RecentUserItem,
  type TopContributorItem,
  type TopFavoritedItem,
} from "@/lib/copywriting-data";

interface StatsOverviewProps {
  stats: OverviewStats;
  topFavorited: TopFavoritedItem[];
  categoryDist: CategoryDistributionItem[];
  topContributors: TopContributorItem[];
  recentUsers: RecentUserItem[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: tone }}
      >
        <Icon className="size-5 text-white" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-none font-semibold">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function StatsOverview({
  stats,
  topFavorited,
  categoryDist,
  topContributors,
  recentUsers,
}: StatsOverviewProps) {
  const maxFav = Math.max(1, ...topFavorited.map((i) => i.favCount));
  const maxCat = Math.max(1, ...categoryDist.map((i) => i.count));

  return (
    <div className="flex flex-col gap-4">
      {/* 数字卡片 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="注册用户" value={stats.userCount} tone="#6366f1" />
        <StatCard icon={FileText} label="文案总数" value={stats.copyCount} tone="#0ea5e9" />
        <StatCard icon={CheckCircle2} label="已通过" value={stats.approvedCount} tone="#10b981" />
        <StatCard icon={EyeOff} label="待审核" value={stats.pendingCount} tone="#f59e0b" />
        <StatCard icon={XCircle} label="已拒绝" value={stats.rejectedCount} tone="#f43f5e" />
        <StatCard icon={Heart} label="收藏总次数" value={stats.favoriteCount} tone="#ec4899" />
        <StatCard icon={MessageSquareWarning} label="待处理反馈" value={stats.pendingFeedbackCount} tone="#8b5cf6" />
        <StatCard icon={FolderTree} label="类目数量" value={stats.categoryCount} tone="#14b8a6" />
      </div>

      {/* 收藏排行榜 */}
      <SectionCard title="收藏排行榜 TOP 10">
        {topFavorited.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            暂无收藏数据
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {topFavorited.map((item, i) => (
              <li key={item.id} className="flex items-center gap-3">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                    i < 3
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.favCount} 次
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(item.favCount / maxFav) * 100}%`,
                        backgroundColor: item.categoryColor,
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 类目分布 */}
        <SectionCard title="类目文案分布">
          {categoryDist.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">暂无类目</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {categoryDist.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="w-20 shrink-0 truncate text-sm">{item.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.count / maxCat) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                    {item.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* 投稿活跃榜 */}
        <SectionCard title="投稿活跃榜 TOP 10">
          {topContributors.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              暂无用户投稿
            </p>
          ) : (
            <ul className="flex flex-col">
              {topContributors.map((u, i) => (
                <li
                  key={u.userId}
                  className="flex items-center gap-3 border-b py-2 text-sm last:border-b-0"
                >
                  <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {u.nickname.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {u.nickname}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.submissionCount} 条投稿
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* 最近注册用户 */}
      <SectionCard title="最近注册用户">
        {recentUsers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">暂无用户</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">用户</th>
                  <th className="py-2 pr-4 font-medium">注册日期</th>
                  <th className="py-2 pr-4 text-right font-medium">投稿数</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.userId} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {u.nickname.slice(0, 1)}
                        </span>
                        <span className="font-medium">{u.nickname}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{u.createdAt}</td>
                    <td className="py-2 pr-4 text-right">{u.submissionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
