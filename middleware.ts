import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * 全局限流中间件（Edge Runtime）
 *
 * 在请求到达业务代码前统一做限流拦截：
 * - 注册 / 登录 / 投稿等敏感接口按策略限流，返回 429 + Retry-After；
 * - 登录用户以用户 id 作为限流 key，匿名用户以 IP 作为 key；
 * - 静态资源与 Next.js 内部路径直接放行，不消耗配额；
 * - Edge 无法直接查数据库，登录用户 id 通过 JWT（jose，Edge 兼容）从 cookie 安全解析。
 *
 * 依赖 Upstash Redis（REST 协议，Edge 兼容）。未配置时自动降级放行，
 * 应用层（lib/rate-limit.ts 等）的限流仍会兜底，不会裸奔。
 */

/** 放行路径：Next 内部与静态资源，以及非敏感接口 */
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/_next\/image/,
  /^\/favicon\.ico$/,
  /^\/public\//,
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
  /^\/api\/captcha/,
  /^\/api\/user\/logout/,
  /^\/api\/auth\/logout/,
];

/** 各接口限流策略（窗口为 Upstash 时长字符串，如 "1 h"） */
const POLICIES = {
  register: { limit: 5, window: "1 h", prefix: "wenan:register" },
  login: { limit: 10, window: "1 h", prefix: "wenan:login" },
  submit: { limit: 30, window: "1 h", prefix: "wenan:submit" },
  batch: { limit: 2, window: "1 h", prefix: "wenan:batch" },
} as const;

type PolicyKey = keyof typeof POLICIES;

/** 请求 → 命中的限流策略（未命中返回 null） */
function matchPolicy(request: NextRequest): PolicyKey | null {
  const { pathname } = request.nextUrl;
  if (pathname === "/api/user/register") return "register";
  if (pathname === "/api/user/login" || pathname === "/api/auth/login") {
    return "login";
  }
  if (pathname === "/api/user/copy/batch" && request.method === "POST") {
    return "batch";
  }
  if (pathname === "/api/user/copy" && request.method === "POST") {
    return "submit";
  }
  return null;
}

/** 从可信来源提取客户端 IP（代理场景取 x-forwarded-for 首项） */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Edge 安全地解析登录用户 id：读取用户 JWT cookie，校验签名与角色 */
async function getUserId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get("wenan_user_token")?.value;
  if (!token) return null;
  const secretValue = process.env.JWT_SECRET;
  if (!secretValue) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secretValue)
    );
    if (payload.role !== "user" || typeof payload.sub !== "string") return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** 模块级 Redis 单例（REST 协议，Edge 兼容） */
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // 未配置：降级放行，由应用层限流兜底
  redis = new Redis({ url, token });
  return redis;
}

/** 按策略缓存的限流器实例 */
const scopedLimits = new Map<PolicyKey, Ratelimit>();
function getScopedLimiter(policyKey: PolicyKey): Ratelimit | null {
  const cached = scopedLimits.get(policyKey);
  if (cached) return cached;
  const r = getRedis();
  if (!r) return null;
  const policy = POLICIES[policyKey];
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
    prefix: policy.prefix,
  });
  scopedLimits.set(policyKey, limiter);
  return limiter;
}

export async function middleware(request: NextRequest) {
  // 静态资源 / Next 内部路径直接放行
  for (const pattern of STATIC_PATTERNS) {
    if (pattern.test(request.nextUrl.pathname)) {
      return NextResponse.next();
    }
  }

  const policyKey = matchPolicy(request);
  if (!policyKey) return NextResponse.next();

  const limiter = getScopedLimiter(policyKey);
  if (!limiter) return NextResponse.next(); // 未配置 Upstash：降级放行

  // 登录用户用 id 作 key，匿名用户用 IP
  const userId = await getUserId(request);
  const identity =
    userId !== null ? `u${userId}` : `ip:${getClientIp(request)}`;

  const { success, reset } = await limiter.limit(identity);

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return new NextResponse(
      JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  // 只对 API 主路径与页面生效；静态资源在中间件内已放行，此处再收窄匹配范围
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
