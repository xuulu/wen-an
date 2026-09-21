import { NextResponse } from "next/server";
import {
  USER_COOKIE,
  getUserCookieMaxAge,
  hashPassword,
  isCookieSecure,
  signUserToken,
} from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { query } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { checkReservedNickname } from "@/lib/reserved-names";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`user-register:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `注册过于频繁，请 ${limited.retryAfter} 秒后再试` },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    nickname?: unknown;
    password?: unknown;
    captchaToken?: unknown;
    captchaAnswer?: unknown;
  } | null;

  const nickname =
    typeof body?.nickname === "string" ? body.nickname.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : "";
  const captchaAnswer =
    typeof body?.captchaAnswer === "string" ? body.captchaAnswer : "";

  if (nickname.length < 2 || nickname.length > 20) {
    return NextResponse.json({ error: "用户名需要 2-20 个字符" }, { status: 400 });
  }
  const reservedError = checkReservedNickname(nickname);
  if (reservedError) {
    return NextResponse.json({ error: reservedError }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const captchaOk = await verifyCaptcha(captchaToken, captchaAnswer);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "验证码错误或已过期", captchaFailed: true },
      { status: 400 }
    );
  }

  const exists = await query("SELECT 1 FROM wenan_users WHERE nickname = $1", [
    nickname,
  ]);
  if (exists.rowCount && exists.rowCount > 0) {
    return NextResponse.json({ error: "用户名已被占用" }, { status: 409 });
  }

  const { rows } = await query<{ id: number }>(
    `INSERT INTO wenan_users (nickname, password_hash)
     VALUES ($1, $2)
     RETURNING id`,
    [nickname, hashPassword(password)]
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("注册失败：未返回用户 id");

  const token = await signUserToken(id);
  const res = NextResponse.json({ id, nickname }, { status: 201 });
  res.cookies.set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: getUserCookieMaxAge(),
    secure: isCookieSecure(),
  });
  return res;
}
