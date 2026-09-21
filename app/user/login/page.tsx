import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { UserAuthForm } from "@/components/user/user-auth-form";

export const metadata: Metadata = {
  title: "登录 - 简心文案库",
  robots: { index: false, follow: false },
};

export default function UserLoginPage() {
  return (
    <AuthLayout title="欢迎回来" description="登录后查看收藏与投稿记录">
      <UserAuthForm mode="login" />
    </AuthLayout>
  );
}
