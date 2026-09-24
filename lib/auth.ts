import "server-only";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

import { query } from "@/lib/db";

const AUTH_COOKIE = "wenan_token";
const USER_COOKIE = "wenan_user_token";
const DEFAULT_TTL_DAYS = 7;
const DURATION_RE = /^(\d+)\s*([dhm]?)$/i;

export interface AdminUser {
  username: string;
}

export interface SessionUser {
  id: number;
  nickname: string;
}

export function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("环境变量 JWT_SECRET 未设置");
  return new TextEncoder().encode(secret);
}

/**
 * 解析时长配置，返回秒数。支持 Nd / Nh / Nm 后缀，无后缀按天。
 * 非法值回退默认 7 天。
 */
function parseDurationSeconds(value: string | undefined): number {
  const fallback = DEFAULT_TTL_DAYS * 24 * 60 * 60;
  if (!value) return fallback;
  const m = DURATION_RE.exec(value.trim());
  if (!m) return fallback;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "h") return n * 60 * 60;
  if (unit === "m") return n * 60;
  return n * 24 * 60 * 60;
}

/** jose 有效期字符串直接取 env，非法时用默认 "7d"（jose 也接受数字秒） */
function getTokenTtl(value: string | undefined): string {
  if (value && DURATION_RE.test(value.trim())) return value.trim();
  return `${DEFAULT_TTL_DAYS}d`;
}

/** 管理员 token 有效期（jose duration，如 7d / 12h） */
export function getAdminTokenTtl(): string {
  return getTokenTtl(process.env.ADMIN_TOKEN_TTL);
}

/**
 * 用户批量投稿冷却时间（秒）：优先读站点设置（后台可调），
 * 支持 Nd/Nh/Nm 格式，非法或缺失回退 1 小时。
 */
export async function getUserBatchCooldownSeconds(): Promise<number> {
  const { getSiteSettings } = await import("@/lib/site-settings");
  const settings = await getSiteSettings();
  const value = settings.user_batch_cooldown;
  const m = DURATION_RE.exec(value.trim());
  if (!m) return 60 * 60;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "h") return n * 60 * 60;
  if (unit === "m") return n * 60;
  return n * 24 * 60 * 60;
}

/** 用户 token 有效期 */
export function getUserTokenTtl(): string {
  return getTokenTtl(process.env.USER_TOKEN_TTL);
}

/** 管理员 cookie maxAge（秒） */
export function getAdminCookieMaxAge(): number {
  return parseDurationSeconds(process.env.ADMIN_TOKEN_TTL);
}

/** 用户 cookie maxAge（秒） */
export function getUserCookieMaxAge(): number {
  return parseDurationSeconds(process.env.USER_TOKEN_TTL);
}

/** 长度相同才比较，避免时序侧信道 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 校验登录凭据（管理员账号来自 .env） */
export function verifyCredentials(username: string, password: string): boolean {
  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;
  if (!envUser || !envPass) {
    throw new Error("环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 未设置");
  }
  return safeEqual(username, envUser) && safeEqual(password, envPass);
}

export async function signAdminToken(username: string): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(getAdminTokenTtl())
    .sign(getSecret());
}

export async function verifyAdminToken(
  token: string
): Promise<AdminUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "admin" || typeof payload.sub !== "string") {
      return null;
    }
    return { username: payload.sub };
  } catch {
    return null;
  }
}

/** 从请求 cookie 解析当前管理员，未登录或 token 无效返回 null */
export async function getAdminUser(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

/* ---------------- 普通用户（wenan_users 表） ---------------- */

/** 密码哈希，格式：scrypt:<saltHex>:<hashHex> */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function signUserToken(userId: number): Promise<string> {
  return new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(getUserTokenTtl())
    .sign(getSecret());
}

async function verifyUserToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "user" || typeof payload.sub !== "string") return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** 当前登录的普通用户（管理员会话不算），未登录返回 null */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (!token) return null;
  const id = await verifyUserToken(token);
  if (!id) return null;

  const { rows } = await query<{
    id: number;
    nickname: string;
  }>("SELECT id, nickname FROM wenan_users WHERE id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, nickname: row.nickname };
}

/** 更改账号名（nickname，唯一性由调用方先校验） */
export async function changeNickname(
  userId: number,
  nickname: string
): Promise<void> {
  await query("UPDATE wenan_users SET nickname = $1 WHERE id = $2", [
    nickname,
    userId,
  ]);
}

/** 更改密码（传入已哈希的新密码） */
export async function changeUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  await query("UPDATE wenan_users SET password_hash = $1 WHERE id = $2", [
    passwordHash,
    userId,
  ]);
}

/** 查询用户当前密码哈希，没有则 null */
export async function getUserPasswordHash(
  userId: number
): Promise<string | null> {
  const { rows } = await query<{ password_hash: string | null }>(
    "SELECT password_hash FROM wenan_users WHERE id = $1",
    [userId]
  );
  return rows[0]?.password_hash ?? null;
}

export { AUTH_COOKIE, USER_COOKIE };

/** HTTPS 部署时在 .env 设置 COOKIE_SECURE=true，登录 cookie 仅经 HTTPS 传输 */
export function isCookieSecure(): boolean {
  return process.env.COOKIE_SECURE === "true";
}
