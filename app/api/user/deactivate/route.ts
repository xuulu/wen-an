import { after, NextResponse } from "next/server";

import {
  USER_COOKIE,
  getCurrentUser,
  getUserPasswordHash,
  isCookieSecure,
  verifyPassword,
} from "@/lib/auth";
import { createJob, processDeactivateJob } from "@/lib/deletion-jobs";

/**
 * 注销账号（默认「内容保留并匿名化」）。
 * body: { password: string, confirm: boolean }
 *   - 已通过投稿解除作者关联、匿名保留；待审/被拒投稿软删；
 *   - 二次验证：登录密码 + confirm；
 *   - 立即作废登录 cookie，匿名化在 after() 中异步完成。
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
    confirm?: unknown;
  } | null;

  if (body?.confirm !== true) {
    return NextResponse.json({ error: "请勾选确认后再操作" }, { status: 400 });
  }

  const password = typeof body?.password === "string" ? body.password : "";
  const storedHash = await getUserPasswordHash(user.id);
  if (!storedHash || !verifyPassword(password, storedHash)) {
    return NextResponse.json({ error: "密码错误，无法注销" }, { status: 401 });
  }

  const job = await createJob({
    kind: "deactivate",
    userId: user.id,
    total: 0,
  });
  after(() => processDeactivateJob(job.id));

  const res = NextResponse.json({ jobId: job.id, ok: true }, { status: 202 });
  // 立即作废登录 cookie
  res.cookies.set(USER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isCookieSecure(),
  });
  return res;
}
