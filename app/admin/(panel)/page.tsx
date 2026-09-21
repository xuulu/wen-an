import { AdminPanelTabs } from "@/components/admin/admin-panel-tabs";
import {
  getCategories,
  getCategoryDistribution,
  getOverviewStats,
  getRecentUsers,
  getTopContributors,
  getTopFavorited,
} from "@/lib/copywriting-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    categories,
    stats,
    topFavorited,
    categoryDist,
    topContributors,
    recentUsers,
  ] = await Promise.all([
    getCategories(),
    getOverviewStats(),
    getTopFavorited(10),
    getCategoryDistribution(),
    getTopContributors(10),
    getRecentUsers(8),
  ]);

  return (
    <AdminPanelTabs
      categories={categories}
      stats={stats}
      topFavorited={topFavorited}
      categoryDist={categoryDist}
      topContributors={topContributors}
      recentUsers={recentUsers}
    />
  );
}
