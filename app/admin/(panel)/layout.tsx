import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { getAdminUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "简心文案库管理后台",
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              返回前台
            </Link>
            <span className="text-sm font-semibold">简心文案库管理后台</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.username}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
