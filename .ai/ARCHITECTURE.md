# ARCHITECTURE.md — 非显性架构知识

> **读取时机：** 当任务涉及共享状态、模块边界、数据流、生命周期、持久化或外部服务时读取本文件。
>
> 只记录源码中不容易直接看出的知识。
> 不要记录每一个文件、模块或类。
> 代码已经表达清楚的内容，不要在这里重复。

## 模块边界

- 根目录 `middleware.ts`：**Edge Runtime 全局限流**，请求到达业务代码前拦截；Edge 不能查 DB，登录用户 id 用 jose 从用户 JWT cookie 安全解析
- `app/api/user/*`：用户侧接口（投稿 / 收藏 / 反馈 / 公告读取 / 账号），校验用户 cookie
- `app/api/admin/*`：管理接口（审核 / 类目 / 公告 / 反馈 / 设置 / 上传），**全部先验管理员**，未授权不进入业务逻辑
- `components/ui/`：shadcn 生成的基础组件，勿随意修改
- `lib/`：核心服务层——
  - 数据：`db.ts`（pg 池）、`copywriting.ts` / `copywriting-data.ts`（类型 + 服务端分页/随机种子查询）、`announcement.ts` / `announcement-data.ts`、`feedback.ts` / `feedback-data.ts`
  - 审核：`review-engine.ts`（机审编排）、`review-keyword.ts`、`review-ai.ts`、`similarity.ts`（投稿去重）
  - 认证 / 防护：`auth.ts`（JWT / 哈希）、`captcha.ts`、`rate-limit.ts`（内存限流兜底）、`reserved-names.ts`、`batch-throttle.ts`
  - 站点级：`site-settings.ts`（设置缓存 / 域名解析）、`seo.ts`（统一 metadata 组装）、`theme.ts`（主题，非 server-only）
- `db/schema.sql`：建表基线（幂等）；`db/migrations/`：编号增量迁移，每个破坏性迁移必须配 `.rollback.sql`

## 数据流

- 投稿（单条 / 批量 / 修改）唯一路径：落库 `pending` → 关键词硬规则（命中直接 `rejected`）→ AI 审核（三态）→ `approved` / `rejected` / 转人工 `pending`
- 前台文案墙：**服务端分页**（`lib/copywriting-data`，首页 `HOME_PAGE_SIZE=50`，后续翻页走 `/api/copy`）；分类筛选 + 关键词 ILIKE（标题 / 正文 / 类目，**标签已移除**）；随机排序 = 请求级 `randomSeed` 传入 SQL（服务端随机 + 翻页稳定），避免全量挂载 / 全量洗牌
- 公告：管理端写 `wenan_announcements`（软隐藏 `is_hidden`、置顶 `is_pinned`）；公开接口 `GET /api/announcements` 返回未隐藏、置顶优先列表；管理端 `/api/admin/announcements` 增删改查
- 删除 / 注销：删除一律**软删**（`wenan_copy_items.deleted_at`，进回收站，冷静期 `deletion_grace_days` 天可恢复，到期由 cron 物理删除）；被收藏数 ≥ `deletion_favorite_threshold` 的文案受保护、作者不可删。批量删除 / 注销写 `wenan_deletion_jobs`（pending）→ 响应 202 → Next `after()` 分块（50/批）执行；`GET /api/cron/deletion-jobs`（Bearer CRON_SECRET）物理清理过期回收站 + 续跑卡住任务。注销 = 已通过投稿 `user_id=NULL` 匿名保留、待审/被拒软删、用户置 `deactivated_at` 且昵称改「已注销用户#id」（登录被拒）
- 管理后台登录：`ADMIN_USERNAME/PASSWORD`（.env）校验后签发 JWT 存 httpOnly cookie

## 状态所有权

- 会话状态：admin / user 双 cookie 分离（`wenan_admin_token` / `wenan_user_token`），JWT 内校验 role；写接口第一行校验会话
- 数据归属：数据层操作均带 `user_id` 归属条件，防越权
- 站点设置：`wenan_site_settings` 键值表，**30 秒缓存**；仅 `updateSiteSettings()` 会主动清缓存（直接改 SQL 不生效，见 TROUBLESHOOTING）
- 主题：选择持久化在 cookie `wenan-theme`（SSR 权威）+ localStorage（首帧兜底）；`ThemeProvider` context 提供 theme/resolved/setTheme；根 layout 内联防 FOUC 脚本在首帧前写 `data-theme`
- 限流计数：Upstash Redis（REST，Edge 共享状态）；未配置时 middleware 降级，`lib/rate-limit.ts` 内存滑动窗口仅单实例有效

## 生命周期规则

- 验证码 token：内存态，一次性使用，答错也消耗（防重放 / 逐次猜测）
- 跑马灯：服务端读设置后把 `marquee_speed_seconds` 写入 CSS 变量 `--marquee-duration`；纯文本渲染，多行以「·」拼接；`marquee_enabled=false` 不渲染
- sitemap / robots：`export const revalidate = 86400` 每日重建；sitemap 收录动态路由（首页、分类页、文案详情页等）

## 外部服务

- PostgreSQL：连接串 `DATABASE_URL`，pg 连接池（server-only）
- Upstash Redis：`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`，Edge 限流；缺失即降级
- OpenAI 兼容接口：AI 文案审核，baseURL / model / key / 提示词后台可配置；未配置或失败时不阻断投稿（转人工）

## 持久化

- 表统一 `wenan_` 前缀：
  - `wenan_users`、`wenan_categories`
  - `wenan_copy_items`（`user_id IS NULL` 为公共预置；**无 tags 列**，标签数据归档于 `wenan_copy_tags_archive`；`deleted_at` 软删）
  - `wenan_user_favorites`、`wenan_feedbacks`、`wenan_announcements`
  - `wenan_site_settings`、`wenan_review_logs`、`wenan_deletion_jobs`
- 文件持久目录：用户上传图片在项目根 `storage/uploads`（.gitignore 忽略，非 public），经 `app/uploads/[filename]` 提供
- 建表基线 `db/schema.sql` 幂等（`CREATE TABLE IF NOT EXISTS`）；增量以 migrations 为准

## 重要系统约束

- **机审 fail-closed（唯一路径）**：所有投稿必须经过 `runReview`；AI 不可解析 / `uncertain` / 未配置 / 网络失败 → 保持 `pending` 转人工，绝不默认放行
- 全部 SQL 参数绑定，无注入面
- 上传扩展名由 MIME 白名单推导，忽略客户端文件名，限 2MB
- HTTPS 部署必须覆写真实 IP（`X-Forwarded-For $remote_addr`），否则伪造请求头可绕过限流
- **禁止给 body 加 filter / transform 动画**（破坏 fixed 定位包含块，侧栏 / sheet UI 会跑丢）；动效只用 background-position / text-shadow / opacity
- 新增路由 / 服务必须同步 `Linux/nginx/production.conf` 并登记 `Linux/README.md`
