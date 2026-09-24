# PROJECT.md — 稳定的项目事实

> **读取时机：** 当任务依赖项目技术栈、运行环境、版本、常用命令、部署方式或长期约束时读取本文件。
>
> 只根据已确认的证据逐步填写。
> 如果某项信息在源码或配置中已经显而易见，就不要记录在这里。
> 不适用于本项目的章节直接删除。

## 项目用途

「简心文案库」——文案收集与分享站点：分类浏览、关键词搜索、一键复制、收藏、用户投稿（机审三态流转：pending / approved / rejected）与完整管理后台。前台面向普通用户，`/admin` 为管理后台，`/user` 为个人中心。

## 技术栈

- 框架：Next.js 16.3.5（App Router + Turbopack）+ React 19
- 语言：TypeScript（strict）
- UI：Tailwind CSS v4 + shadcn/ui（base-nova 风格，底层 @base-ui/react）+ lucide-react 图标
- 数据库：PostgreSQL（pg 8.23 连接池）
- 认证：JWT（jose），httpOnly cookie；用户 / 管理员双 cookie 分离
- 密码哈希：scrypt + salt + timingSafeEqual
- 包管理：pnpm（packageManager pnpm@10.10.0）

## 重要版本

- next 16.3.5、react / react-dom 19.2.8、pg ^8.23.0、jose ^6.2.12
- 版本兼容性以 package.json / pnpm-lock.yaml 为最终依据，生成代码前重新确认。

## 运行环境

- Node.js（开发机 v22 可用；生产按部署环境）
- 依赖外部服务：PostgreSQL（连接串由 `DATABASE_URL` 提供）
- 依赖 OpenAI 兼容接口（AI 文案审核，baseURL / model / key 后台可配置）
- HTTPS 部署需 `COOKIE_SECURE=true`；本地 http 调试保持 `false`

## 重要依赖

- `pg`：唯一数据库访问方式（lib/db.ts 连接池 + query 封装，server-only）
- `jose`：JWT 签发 / 校验（lib/auth.ts）
- `shadcn` / `@base-ui/react`：UI 基础组件（components/ui/ 为生成代码，勿随意修改）

## 常用命令

```bash
pnpm install            # 安装依赖
pnpm dev                # 开发服务器（Turbopack，http://localhost:3000）
pnpm build              # 生产构建
pnpm start              # 生产运行
pnpm lint               # ESLint 检查
pnpm exec tsc --noEmit  # TypeScript 类型检查
psql "$DATABASE_URL" -f db/schema.sql   # 初始化数据库（幂等）
```

## 部署

1. 复制 `.env.example` 为 `.env`，填写 `DATABASE_URL`、`ADMIN_USERNAME/PASSWORD`、`JWT_SECRET`、token TTL、`COOKIE_SECURE`
2. 执行 `db/schema.sql` 建表（幂等，统一 `wenan_` 前缀）
3. `pnpm build && pnpm start`
4. HTTPS 部署要点（详见 README）：nginx 反代必须用 `proxy_set_header X-Forwarded-For $remote_addr`（不要用 `$proxy_add_x_forwarded_for`，客户端可伪造）；`JWT_SECRET` 用独立随机值；AI 审核 key 存后台站点设置，改 key 无需重启
5. SEO 对外域名：优先后台「站点设置 → 站点域名」`site_url`，部署兜底用环境变量 `SITE_URL`（完整 URL）；两者都未配置或为 localhost 时，sitemap/robots 不输出任何域名（sitemap 空、robots 禁止抓取）

## 长期约束

- 投稿审核 fail-closed：所有投稿（单条 / 批量 / 修改）统一走机审编排 `runReview`，任何异常一律转人工 pending，绝不默认放行
- 上传接口扩展名由 MIME 白名单推导，忽略客户端文件名，限 2MB
- 全部 SQL 参数绑定，无字符串拼接注入面；写接口第一行校验会话（admin / user cookie 分离，JWT 校验 role），数据层操作带 `user_id` 归属条件防越权
- 限流 / 冷却 / 验证码状态存内存，适用于单实例部署；多实例需换 Redis
