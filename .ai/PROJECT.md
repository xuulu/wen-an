# PROJECT.md — 稳定的项目事实

> **读取时机：** 当任务依赖项目技术栈、运行环境、版本、常用命令、部署方式或长期约束时读取本文件。
>
> 只根据已确认的证据逐步填写。
> 如果某项信息在源码或配置中已经显而易见，就不要记录在这里。
> 不适用于本项目的章节直接删除。

## 项目用途

「简心文案库」——文案收集与分享站点：分类浏览、关键词搜索、一键复制、收藏、每日推荐、用户投稿（机审三态流转：pending / approved / rejected）与完整管理后台。前台面向普通用户，`/admin` 为管理后台，`/user` 为个人中心。

## 技术栈

- 框架：Next.js 16.3.5（App Router + Turbopack）+ React 19.2.8
- 语言：TypeScript 5.9（strict）
- UI：Tailwind CSS v4 + shadcn/ui（base-nova 风格，底层 @base-ui/react）+ lucide-react 图标
- 数据库：PostgreSQL（pg 8.23 连接池）
- 认证：JWT（jose），httpOnly cookie；用户 / 管理员双 cookie 分离
- 限流：@upstash/ratelimit + @upstash/redis（根目录 Edge middleware），内存限流兜底
- 密码哈希：scrypt + salt + timingSafeEqual
- 包管理：pnpm（packageManager pnpm@10.10.0）

## 重要版本

- next 16.3.5、react / react-dom 19.2.8、pg ^8.23.0、jose ^6.2.12
- @upstash/ratelimit ^2.2.0、@upstash/redis ^1.39.0
- 版本兼容性以 package.json / pnpm-lock.yaml 为最终依据，生成代码前重新确认。

## 运行环境

- Node.js（开发机 v22 可用；生产按部署环境）
- 依赖外部服务：PostgreSQL（连接串由 `DATABASE_URL` 提供）
- 可选外部服务：Upstash Redis（REST 协议，Edge 限流用；未配置时 middleware 降级放行，内存限流兜底）
- 依赖 OpenAI 兼容接口（AI 文案审核，baseURL / model / key 后台可配置）
- HTTPS 部署需 `COOKIE_SECURE=true`；本地 http 调试保持 `false`

## 重要依赖

- `pg`：唯一数据库访问方式（lib/db.ts 连接池 + query 封装，server-only）
- `jose`：JWT 签发 / 校验（lib/auth.ts），Edge middleware 中也用它安全解析用户 id
- `@upstash/ratelimit` / `@upstash/redis`：Edge 全局限流（middleware.ts）
- `@base-ui/react`：UI 基础组件（components/ui/ 为生成代码，勿随意修改）

## 目录要点

- `app/`：App Router 页面与路由；根级 `sitemap.ts` / `robots.ts` / `manifest.ts` / `not-found.tsx`；信息页 `/about` `/contact` `/copyright`（版权与侵权投诉）`/privacy` `/terms`，共享 `components/library/legal-page.tsx` 版式，页脚「帮助中心」统一入口
- `lib/`：服务层（数据、认证、审核、SEO、主题、公告、限流等，均 server-only，除 theme.ts）
- `components/ui/`：shadcn 生成组件（勿手改）；`components/admin|user|library|seo/`：业务组件
- `db/schema.sql`：建表基线（幂等，统一 `wenan_` 前缀）；`db/migrations/`：增量迁移（编号 + rollback）
- `middleware.ts`：根目录 Edge 全局限流
- `Linux/nginx/production.conf`：生产 Nginx 配置；`Linux/README.md`：转发规则登记

## 常用命令

```bash
pnpm install            # 安装依赖
pnpm dev                # 开发服务器（Turbopack，http://localhost:3000）
pnpm build              # 生产构建
pnpm start              # 生产运行
pnpm lint               # ESLint 检查
pnpm exec tsc --noEmit  # TypeScript 类型检查
psql "$DATABASE_URL" -f db/schema.sql   # 初始化数据库（幂等）
psql "$DATABASE_URL" -f db/migrations/00X_xxx.sql   # 执行增量迁移（先看 rollback）
```

> 项目无测试框架，验证闭环 = `pnpm lint` + `pnpm exec tsc --noEmit` + `pnpm build` +（`pnpm start` 后 curl / 浏览器冒烟）。

## 部署

1. 复制 `.env.example` 为 `.env`，**只保留必要项**：`DATABASE_URL`、`ADMIN_USERNAME/PASSWORD`、`JWT_SECRET`、token TTL、`COOKIE_SECURE`，以及可选的 `UPSTASH_REDIS_REST_URL/TOKEN`、`SITE_URL`
2. 执行 `db/schema.sql` 建表（幂等）；增量变更执行 `db/migrations/` 下脚本（生产破坏性变更必须先归档 + 提供 rollback）
3. `pnpm build && pnpm start`
4. Nginx 反代：使用 `Linux/nginx/production.conf`，必须 `proxy_set_header X-Forwarded-For $remote_addr`（不要用 `$proxy_add_x_forwarded_for`，客户端可伪造）；`JWT_SECRET` 用独立随机值；AI key 存后台站点设置，改 key 无需重启
5. **新增路由 / 服务时，必须同步更新 `Linux/nginx/production.conf` 并登记到 `Linux/README.md`**
6. SEO 对外域名：优先后台「站点设置 → 站点域名」`site_url`，部署兜底用环境变量 `SITE_URL`（完整 URL）；两者都未配置或为 localhost 时，sitemap/robots 不输出任何域名

## 长期约束

- 投稿审核 fail-closed：所有投稿（单条 / 批量 / 修改）统一走机审编排 `runReview`，任何异常一律转人工 pending，绝不默认放行
- 非必要配置一律由 admin「站点设置」接管（.env 只留基础设施与密钥）；改配置实时生效（30s 缓存，保存即失效）
- 文案标签（tags）功能已全链路移除（迁移 002，数据归档非破坏），不得重新引用
- 全局限流前置在根目录 `middleware.ts`（Edge）：注册 / 登录 / 投稿 / 批量按策略拦截，返回 429 + Retry-After；静态资源与 `_next` 放行；未配置 Redis 时降级，由 `lib/rate-limit.ts` 内存兜底
- 全站支持 light / dark / system / neon（彩蛋）四主题；**禁止给 body 加 filter / transform 动画**（会破坏 fixed 定位，历史 bug 见 TROUBLESHOOTING）
- Sheet 弹层：`SheetContent` 无默认内边距，使用方必须给 SheetHeader、内容区（`flex-1 overflow-y-auto px-5 py-5`）、SheetFooter 分别加 `px-5`
- 上传接口扩展名由 MIME 白名单推导，忽略客户端文件名，限 2MB
- 全部 SQL 参数绑定，无字符串拼接注入面；写接口第一行校验会话（admin / user cookie 分离，JWT 校验 role），数据层操作带 `user_id` 归属条件防越权
- SEO 是高优先级：每个 page 都要设置 metadata（标题 / 描述 / OG / Twitter / canonical / robots）与必要的 JSON-LD；首页标题必须读站点设置，禁止写死
