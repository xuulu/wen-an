import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserDashboard } from "@/components/user/user-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/copywriting-data";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `个人中心 - ${settings.site_name}`,
    robots: { index: false, follow: false },
  };
}

export default async function UserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/user/login");

  const categories = await getCategories();

  return (
    <UserDashboard
      nickname={user.nickname}
      categories={categories}
    />
  );
}
