# ARCHITECTURE.md — 非显性架构知识

> **读取时机：** 当任务涉及共享状态、模块边界、数据流、生命周期、持久化或外部服务时读取本文件。
>
> 只记录源码中不容易直接看出的知识。
> 不要记录每一个文件、模块或类。
> 代码已经表达清楚的内容，不要在这里重复。

## 模块边界

- `app/api/user/*`：用户侧接口（投稿 / 收藏 / 反馈 / 账号），校验用户 cookie
- `app/api/admin/*`：管理接口（审核 / 设置 / 上传），**全部先验管理员**，未授权不进入业务逻辑
- `components/ui/`：shadcn 生成的基础组件，勿随意修改
- `lib/`：核心服务层——`db.ts`（pg 连接池）、`review-engine.ts`（机审编排）、`auth.ts`（JWT / 密码哈希）、`captcha.ts`（图形验证码）、`rate-limit.ts`（限流）、`site-settings.ts`（站点设置缓存）、`similarity.ts`（投稿相似度去重）
- `db/schema.sql`：建表脚本（幂等，统一 `wenan_` 前缀），表结构以该脚本为准

## 数据流

- 投稿（单条 / 批量 / 修改）唯一路径：落库 `pending` → 关键词硬规则（命中直接 `rejected`）→ AI 审核（三态）→ `approved` / `rejected` / 转人工 `pending`
- 前台文案墙：分类筛选 + 关键词 ILIKE 模糊匹配（标题 / 正文 / 类目 / 标签）+ 客户端分页（每页 50）；随机排序 = 服务端随机种子 + 客户端种子 PRNG 洗牌，翻页顺序稳定
- 管理后台登录：`ADMIN_USERNAME/PASSWORD`（来自 .env）校验后签发 JWT 存 httpOnly cookie

## 状态所有权

- 会话状态：admin / user 双 cookie 分离，JWT 内校验 role；写接口第一行校验会话
- 数据归属：数据层操作均带 `user_id` 归属条件，防越权
- 站点设置：`wenan_site_settings` 键值表，30 秒缓存自动失效（改配置实时生效）

## 生命周期规则

- 限流 / 冷却 / 验证码 token：内存态（滑动窗口），单实例有效；多实例部署需换 Redis
- 验证码 token 一次性使用，答错也消耗（防重放与逐次猜测）

## 外部服务

- PostgreSQL：连接串 `DATABASE_URL`，pg 连接池（server-only）
- OpenAI 兼容接口：AI 文案审核，baseURL / model / key / 提示词后台可配置；未配置或失败时不阻断投稿（转人工）

## 持久化

- 表统一 `wenan_` 前缀：`wenan_users`、`wenan_categories`、`wenan_copy_items`（`user_id IS NULL` 为公共预置；tags 为原生 `TEXT[]`）、`wenan_user_favorites`、`wenan_feedbacks`、`wenan_site_settings`
- 建表脚本 `db/schema.sql` 幂等（`CREATE TABLE IF NOT EXISTS`）

## 重要系统约束

- **机审 fail-closed（唯一路径）**：所有投稿必须经过 `runReview`；AI 返回不可解析 / `uncertain` / 未配置 / 网络失败 → 保持 `pending` 转人工，绝不默认放行
- 全部 SQL 参数绑定，无注入面
- 上传扩展名由 MIME 白名单推导，忽略客户端文件名，限 2MB
- HTTPS 部署必须覆写真实 IP（`X-Forwarded-For $remote_addr`），否则伪造请求头可绕过登录限流
