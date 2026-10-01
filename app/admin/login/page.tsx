import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/admin/login-form";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `登录 - ${settings.site_name}管理后台`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminLoginPage() {
  const settings = await getSiteSettings();
  return (
    <AuthLayout title={`${settings.site_name}管理后台`} description="请输入管理员账号登录">
      <LoginForm />
    </AuthLayout>
  );
}
