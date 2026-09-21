import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "登录 - 简心文案库管理后台",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <AuthLayout title="简心文案库管理后台" description="请输入管理员账号登录">
      <LoginForm />
    </AuthLayout>
  );
}
