import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import {
  getSiteSettings,
  updateSiteSettings,
  type SettingKey,
} from "@/lib/site-settings";

/** 管理员：读取全部站点设置 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }
  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

/** 管理员：批量更新站点设置 */
export async function PUT(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    settings?: Record<string, unknown>;
  } | null;

  const incoming = body?.settings;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "提交数据不合法" }, { status: 400 });
  }

  const patch: Partial<Record<SettingKey, string>> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string") {
      patch[key as SettingKey] = value;
    } else if (typeof value === "boolean" || typeof value === "number") {
      patch[key as SettingKey] = String(value);
    }
  }

  const settings = await updateSiteSettings(patch);
  return NextResponse.json({ settings });
}
