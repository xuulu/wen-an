import { NextResponse } from "next/server";
import {
  USER_COOKIE,
  getUserCookieMaxAge,
  isCookieSecure,
  signUserToken,
  verifyPassword,
} from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { query } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`user-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `尝试过于频繁，请 ${limited.retryAfter} 秒后再试` },
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

  if (!nickname || !password) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const captchaOk = await verifyCaptcha(captchaToken, captchaAnswer);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "验证码错误或已过期", captchaFailed: true },
      { status: 400 }
    );
  }

  const { rows } = await query<{
    id: number;
    nickname: string;
    password_hash: string | null;
  }>(
    "SELECT id, nickname, password_hash FROM wenan_users WHERE nickname = $1",
    [nickname]
  );
  const user = rows[0];
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: "用户名或密码错误", captchaFailed: true },
      { status: 401 }
    );
  }

  const token = await signUserToken(user.id);
  const res = NextResponse.json({
    id: user.id,
    nickname: user.nickname,
  });
  res.cookies.set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: getUserCookieMaxAge(),
    secure: isCookieSecure(),
  });
  return res;
}
