import { randomUUID } from "node:crypto";

import { LibraryShell } from "@/components/library/library-shell";
import { SiteFooter } from "@/components/library/site-footer";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCopyItems,
  getTopFavorited,
} from "@/lib/copywriting-data";
import type { CopyItem } from "@/lib/copywriting";

export const dynamic = "force-dynamic";

/** 按日期确定性选择一条推荐文案（同一天固定同一条） */
function pickDailyRecommend(items: CopyItem[]): CopyItem | null {
  if (items.length === 0) return null;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000
  );
  return items[dayOfYear % items.length];
}

export default async function Home() {
  const user = await getCurrentUser();

  const [categories, { items }, hotItems] = await Promise.all([
    getCategories(),
    getCopyItems({ userId: user?.id ?? 0 }),
    getTopFavorited(5, true),
  ]);

  const initialRecommended = pickDailyRecommend(items);

  return (
    <LibraryShell
      items={items}
      categories={categories}
      initialRecommended={initialRecommended}
      isLoggedIn={!!user}
      userNickname={user?.nickname ?? ""}
      hotItems={hotItems}
      seed={randomUUID().split("-").reduce((acc, part) => (acc ^ parseInt(part, 16)) >>> 0, 0)}
      footer={<SiteFooter />}
    />
  );
}
