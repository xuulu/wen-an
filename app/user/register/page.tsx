import { AuthLayout } from "@/components/auth/auth-layout";
import { UserAuthForm } from "@/components/user/user-auth-form";

export const metadata = { title: "注册 - 简心文案库" };

export default function UserRegisterPage() {
  return (
    <AuthLayout title="创建账号" description="注册后即可收藏文案、投稿分享">
      <UserAuthForm mode="register" />
    </AuthLayout>
  );
}
