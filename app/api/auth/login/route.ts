import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  getAdminCookieMaxAge,
  isCookieSecure,
  signAdminToken,
  verifyCredentials,
} from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `尝试过于频繁，请 ${limited.retryAfter} 秒后再试` },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;

  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "请输入用户名和密码" },
      { status: 400 }
    );
  }

  let ok: boolean;
  try {
    ok = verifyCredentials(username, password);
  } catch {
    return NextResponse.json(
      { error: "服务端未配置管理员账号，请检查 .env" },
      { status: 500 }
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await signAdminToken(username);
  const res = NextResponse.json({ username, role: "admin" });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: getAdminCookieMaxAge(),
    secure: isCookieSecure(),
  });
  return res;
}
