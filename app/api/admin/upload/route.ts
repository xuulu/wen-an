import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { getAdminUser } from "@/lib/auth";
import { updateSiteSettings } from "@/lib/site-settings";

/**
 * 管理员：上传站点图标/图片（favicon / logo / og image）
 * form-data: file=<文件>; field=site_icon|site_logo|site_og_image
 *
 * 尺寸与压缩：
 * - 原始文件上限 10MB（放开 2MB 限制）；
 * - PNG/JPG/WebP 用 sharp 压缩：最长边 ≤ 1200px、质量 80（OG 图/Logo 足够，
 *   同时避免超清原图拖慢首屏）；GIF 动画/SVG 文本格式不压缩、按原样保存。
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
  // 否则伪装成 image/png 的 .html 会落到上传目录被当作网页执行（存储型 XSS）
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/x-icon",
    "image/svg+xml",
    "image/gif",
  ];
  const MIME_EXT: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/x-icon": ".ico",
    "image/svg+xml": ".svg",
    "image/gif": ".gif",
  };
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "仅支持 PNG/JPG/WebP/ICO/SVG/GIF 图片" },
      { status: 400 }
    );
  }
  // 原始体积上限 10MB；超出直接拒绝（防超大文件拖垮服务器）
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "图片需小于 10MB" }, { status: 400 });
  }

  const filename = `${randomUUID()}${MIME_EXT[file.type]}`;
  // 上传到项目根的持久目录 storage/uploads（不进 public）：
  // Next 生产模式只在构建时固化 public 静态清单，运行时写入 public 的文件
  // 在 next start 下会 404（上传图片无效的根因）。
  // 文件由 app/uploads/[filename]/route.ts 提供，路径仍是 /uploads/<name>。
  const uploadDir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(uploadDir, { recursive: true });

  let bytes = Buffer.from(await file.arrayBuffer());

  // 位图压缩（GIF 动画 / SVG 不压缩）
  if (file.type !== "image/gif" && file.type !== "image/svg+xml") {
    try {
      const img = sharp(bytes, { animated: false });
      const meta = await img.metadata();
      // 最大输出尺寸：site_icon 是正方形图标，Logo/OG 图最长边 1200 足够
      const maxSide = field === "site_icon" ? 512 : 1200;
      if (meta.width && meta.height) {
        img.resize(maxSide, maxSide, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      // 同格式输出压缩（PNG 用 palette 量化，JPG/WebP 用质量 80）
      if (file.type === "image/png") {
        img.png({ quality: 85, palette: true });
      } else if (file.type === "image/jpeg") {
        img.jpeg({ quality: 80, mozjpeg: true });
      } else if (file.type === "image/webp") {
        img.webp({ quality: 80 });
      } else {
        img.toFormat("png", { quality: 85 });
      }
      const out = await img.toBuffer();
      // 压缩后不应比原图更大（小图原样保存）
      bytes = out.length < bytes.length ? out : bytes;
    } catch {
      // sharp 处理失败（如损坏文件）：保留原字节，后续由文件服务按 MIME 返回
    }
  }

  await writeFile(path.join(uploadDir, filename), bytes);

  const publicPath = `/uploads/${filename}`;
  await updateSiteSettings({ [field]: publicPath });

  return NextResponse.json({ path: publicPath });
}
