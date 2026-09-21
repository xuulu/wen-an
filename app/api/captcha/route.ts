import { NextResponse } from "next/server";
import { createCaptcha } from "@/lib/captcha";

/** 获取图形验证码（每次返回新的 token 与 SVG） */
export async function GET() {
  const challenge = await createCaptcha();
  return NextResponse.json(challenge, {
    headers: {
      // 验证码图片不允许被中间缓存
      "Cache-Control": "no-store",
    },
  });
}
