import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { UserAuthForm } from "@/components/user/user-auth-form";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `注册 - ${settings.site_name}`,
    robots: { index: false, follow: false },
  };
}

export default function UserRegisterPage() {
  return (
    <AuthLayout title="创建账号" description="注册后即可收藏文案、投稿分享">
      <UserAuthForm mode="register" />
    </AuthLayout>
  );
}
