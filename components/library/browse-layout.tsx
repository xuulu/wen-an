import type { ReactNode } from "react";

import { BrowseShell } from "@/components/library/browse-shell";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCategoryCounts,
  getFavoritesCount,
} from "@/lib/copywriting-data";
import { getSeoContext } from "@/lib/seo";

/**
 * 前台浏览页侧边栏布局（服务端）：统一取分类/数量/收藏数/登录态/站点名，
 * 供详情页、FAQ、关于、分类总览等页面复用全局侧边栏骨架。
 */
export async function BrowseLayout({
  activeId = "none",
  header,
  children,
}: {
  activeId?: string;
  header?: ReactNode;
  children: ReactNode;
}) {
  const [categories, categoryCounts, favoritesCount, user, seoContext] =
    await Promise.all([
      getCategories(),
      getCategoryCounts(),
      getFavoritesCount(0),
      getCurrentUser(),
      getSeoContext(),
    ]);

  return (
    <BrowseShell
      activeId={activeId}
      header={header}
      sidebar={{
        categories,
        categoryCounts,
        favoritesCount,
        isLoggedIn: !!user,
        userNickname: user?.nickname ?? "",
        siteName: seoContext.siteName,
      }}
    >
      {children}
    </BrowseShell>
  );
}
