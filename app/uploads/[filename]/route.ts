import { readFile } from "node:fs/promises";
import path from "node:path";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 用户上传图片的文件服务路由（替代 public 静态托管）。
 *
 * 上传文件存于项目根 storage/uploads，经本路由读取，路径为 /uploads/<filename>。
 * 这样生产模式（next start）运行时新上传的文件也能立即访问，不依赖构建期 public 清单。
 *
 * 安全：
 * - filename 只取 basename 并白名单扩展名，防路径穿越；
 * - 响应 X-Content-Type-Options: nosniff；
 * - 对可内嵌脚本的 SVG 加 restrictive CSP（禁脚本 / 外部资源），防存储型 XSS；
 * - UUID 文件名内容不变，给一年 immutable 缓存。
 */

export const revalidate = 0;

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

/** 解析并校验文件名，返回绝对路径或 null */
function resolveStorageFile(filename: string): { file: string; ext: string } | null {
  // 去路径，只保留文件名（防 ../../）
  const base = path.basename(filename);
  const ext = path.extname(base).toLowerCase();
  if (!MIME_BY_EXT[ext]) return null;
  // 仅允许 UUID 风格文件名（字母数字与连字符 + 扩展名）
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(base)) return null;
  return {
    file: path.join(process.cwd(), "storage", "uploads", base),
    ext,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const resolved = resolveStorageFile(filename);
  if (!resolved) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(resolved.file);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  const isSvg = resolved.ext === ".svg";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": MIME_BY_EXT[resolved.ext],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVG 可内嵌脚本：禁脚本 / fetch / 外部资源，仅允许内联样式用于呈现
      ...(isSvg
        ? {
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; img-src data:;",
            "Content-Disposition": "inline",
          }
        : {}),
    },
  });
}
