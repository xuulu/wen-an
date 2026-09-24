import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getAdminUser } from "@/lib/auth";
import { updateSiteSettings } from "@/lib/site-settings";

/**
 * 管理员：上传站点图标/图片（favicon / logo / og image）
 * form-data: file=<文件>; field=site_icon|site_logo|site_og_image
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const field = String(form?.get("field") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择要上传的图片" }, { status: 400 });
  }
  if (!["site_icon", "site_logo", "site_og_image"].includes(field)) {
    return NextResponse.json({ error: "上传目标不合法" }, { status: 400 });
  }

  // MIME 由客户端声明可伪造，扩展名必须由白名单推导，
  // 否则伪装成 image/png 的 .html 会落到 public/uploads 被当作网页执行（存储型 XSS）
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/svg+xml"];
  const MIME_EXT: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/x-icon": ".ico",
    "image/svg+xml": ".svg",
  };
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "仅支持 PNG/JPG/WebP/ICO/SVG 图片" },
      { status: 400 }
    );
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "图片需小于 2MB" }, { status: 400 });
  }

  const filename = `${randomUUID()}${MIME_EXT[file.type]}`;
  // 上传到项目根的持久目录 storage/uploads（不进 public）：
  // Next 生产模式只在构建时固化 public 静态清单，运行时写入 public 的文件
  // 在 next start 下会 404（上传图片无效的根因）。
  // 文件由 app/uploads/[filename]/route.ts 提供，路径仍是 /uploads/<name>。
  const uploadDir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);

  const publicPath = `/uploads/${filename}`;
  await updateSiteSettings({ [field]: publicPath });

  return NextResponse.json({ path: publicPath });
}
