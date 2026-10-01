import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { UserAuthForm } from "@/components/user/user-auth-form";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `登录 - ${settings.site_name}`,
    robots: { index: false, follow: false },
  };
}

export default function UserLoginPage() {
  return (
    <AuthLayout title="欢迎回来" description="登录后查看收藏与投稿记录">
      <UserAuthForm mode="login" />
    </AuthLayout>
  );
}
