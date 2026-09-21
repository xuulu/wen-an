import "server-only";
import { SignJWT, jwtVerify } from "jose";

import { getSecret } from "@/lib/auth";

/**
 * 图形验证码：服务端生成 4 字符答案与干扰 SVG，
 * 答案封进短期 JWT（captcha token）随图片一起返回，
 * 登录/注册时校验用户输入，防止批量注册与爆破。
 */

const CAPTCHA_TTL = "5m";
// 去掉易混淆字符 0 O 0 1 I L
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 4;

export interface CaptchaChallenge {
  token: string;
  svg: string;
}

function randomAnswer(): string {
  let answer = "";
  for (let i = 0; i < LENGTH; i += 1) {
    answer += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return answer;
}

function randomColor(min: number, max: number): string {
  const channel = () =>
    Math.floor(min + Math.random() * (max - min)).toString(16).padStart(2, "0");
  return `#${channel()}${channel()}${channel()}`;
}

/** 生成带干扰线、干扰点、随机旋转字符的 SVG（宽 120 高 40） */
function buildSvg(answer: string): string {
  const width = 120;
  const height = 40;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#f8fafc"/>`,
  ];

  // 干扰线
  for (let i = 0; i < 5; i += 1) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    parts.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${randomColor(120, 220)}" stroke-width="1" opacity="0.7"/>`
    );
  }

  // 字符
  const step = width / (answer.length + 1);
  [...answer].forEach((char, i) => {
    const x = step * (i + 1);
    const y = 25 + Math.floor(Math.random() * 8) - 4;
    const rotate = Math.floor(Math.random() * 40) - 20;
    const fontSize = 22 + Math.floor(Math.random() * 5);
    parts.push(
      `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Georgia, serif" font-weight="bold" fill="${randomColor(30, 130)}" text-anchor="middle" transform="rotate(${rotate} ${x} ${y})">${char}</text>`
    );
  });

  // 干扰点
  for (let i = 0; i < 30; i += 1) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    parts.push(
      `<circle cx="${x}" cy="${y}" r="1" fill="${randomColor(80, 200)}"/>`
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

/** 生成一次验证码挑战 */
export async function createCaptcha(): Promise<CaptchaChallenge> {
  const answer = randomAnswer();
  const token = await new SignJWT({ purpose: "captcha", answer })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(CAPTCHA_TTL)
    .sign(getSecret());
  return { token, svg: buildSvg(answer) };
}

/** 已使用的一次性 token → 过期时间（ms），防止同一验证码 5 分钟内重复使用 */
const usedTokens = new Map<string, number>();
let lastSweep = Date.now();

function sweepUsed(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [token, exp] of usedTokens) {
    if (exp <= now) usedTokens.delete(token);
  }
}

/** 校验用户输入（不区分大小写）；token 无效/过期/已使用/答案错误均返回 false */
export async function verifyCaptcha(
  token: string,
  input: string
): Promise<boolean> {
  try {
    const now = Date.now();
    sweepUsed(now);
    if (usedTokens.has(token)) return false;
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "captcha" || typeof payload.answer !== "string") {
      return false;
    }
    const ok = payload.answer.toUpperCase() === input.trim().toUpperCase();
    // 无论答案对错都消耗该 token，防止爆破逐次猜测
    usedTokens.set(token, (payload.exp ?? 0) * 1000);
    if (ok) sweepUsed(now);
    return ok;
  } catch {
    return false;
  }
}
