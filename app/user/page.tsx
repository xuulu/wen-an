import { redirect } from "next/navigation";

import { UserDashboard } from "@/components/user/user-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/copywriting-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "个人中心 - 简心文案库" };

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
