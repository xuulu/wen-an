import { NextResponse } from "next/server";

import {
  changeNickname,
  changeUserPassword,
  getCurrentUser,
  getUserPasswordHash,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

/**
 * PATCH：登录用户修改用户名（nickname）和/或密码。
 * body: { nickname?, currentPassword?, newPassword? }
 * 修改成功后由前端清空 cookie 并跳回登录页。
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 应用层内存限流兜底（与 middleware 策略一致，Upstash 未配置时仍有限流）
  const limited = rateLimit(`profile:${user.id}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "修改过于频繁，请稍后再试" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfter) },
      }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    nickname?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;

  const nextNickname =
    typeof body?.nickname === "string" ? body.nickname.trim() : "";
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";

  const nicknameChanged =
    nextNickname !== "" && nextNickname !== user.nickname;
  const passwordChanged = newPassword !== "";

  if (!nicknameChanged && !passwordChanged) {
    return NextResponse.json({ error: "没有需要修改的内容" }, { status: 400 });
  }

  if (nicknameChanged) {
    if (nextNickname.length < 2 || nextNickname.length > 20) {
      return NextResponse.json(
        { error: "用户名需要 2-20 个字符" },
        { status: 400 }
      );
    }
    const { rows } = await query<{ id: number }>(
      "SELECT id FROM wenan_users WHERE nickname = $1 AND id <> $2",
      [nextNickname, user.id]
    );
    if (rows.length > 0) {
      return NextResponse.json(
        { error: "用户名已被占用" },
        { status: 409 }
      );
    }
  }

  if (passwordChanged) {
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密码至少 6 位" },
        { status: 400 }
      );
    }
    if (!currentPassword) {
      return NextResponse.json(
        { error: "修改密码需要输入当前密码" },
        { status: 400 }
      );
    }
    const storedHash = await getUserPasswordHash(user.id);
    if (!storedHash || !verifyPassword(currentPassword, storedHash)) {
      return NextResponse.json(
        { error: "当前密码不正确" },
        { status: 400 }
      );
    }
  }

  if (nicknameChanged) await changeNickname(user.id, nextNickname);
  if (passwordChanged) {
    await changeUserPassword(user.id, hashPassword(newPassword));
  }

  return NextResponse.json({ ok: true });
}
