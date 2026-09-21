"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsPanel({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [nextUsername, setNextUsername] = useState(nickname);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const usernameChanged = nextUsername.trim() !== nickname;
  const passwordChanged = newPassword !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!usernameChanged && !passwordChanged) return;
    if (nextUsername.trim().length < 2 || nextUsername.trim().length > 20) {
      alert("用户名需要 2-20 个字符");
      return;
    }
    if (passwordChanged) {
      if (newPassword.length < 6) {
        alert("新密码至少 6 位");
        return;
      }
      if (newPassword !== confirmPassword) {
        alert("两次输入的新密码不一致");
        return;
      }
      if (!currentPassword) {
        alert("修改密码需要输入当前密码");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: {
        nickname?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {};
      if (usernameChanged) payload.nickname = nextUsername.trim();
      if (passwordChanged) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "保存失败");
      }

      // 清空登录态后回登录页
      await fetch("/api/user/logout", { method: "POST" });
      router.push("/user/login");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败，请重试");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-xl flex-col gap-5 rounded-xl border bg-card p-4 sm:p-5"
    >
      {/* 修改用户名 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserRound className="size-4 text-muted-foreground" />
          用户名
        </div>
        <Input
          value={nextUsername}
          onChange={(e) => setNextUsername(e.target.value)}
          maxLength={20}
          autoComplete="username"
        />
      </div>

      <div className="border-t" />

      {/* 修改密码 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="size-4 text-muted-foreground" />
          修改密码 <span className="text-muted-foreground">（不需要可留空）</span>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="current-password" className="text-xs text-muted-foreground">
            当前密码
          </label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="new-password" className="text-xs text-muted-foreground">
              新密码
            </label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm-password" className="text-xs text-muted-foreground">
              确认新密码
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          保存成功后需要重新登录
        </p>
        <Button
          type="submit"
          disabled={saving || (!usernameChanged && !passwordChanged)}
        >
          {saving && <Loader2 className="animate-spin" />}
          保存
        </Button>
      </div>
    </form>
  );
}
