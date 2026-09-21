# 简心文案库

基于 Next.js 16（App Router）的文案收集与分享站点：分类浏览、关键词搜索、一键复制、收藏、用户投稿（机审三态流转）与完整管理后台。

## 功能总览

### 前台
- **首页文案墙**：分类筛选、关键词搜索（标题/正文/类目/标签 ILIKE 模糊匹配）、一键复制、客户端分页（每页 50 条，跳页）
- **随机排序**：服务端生成随机种子 + 客户端种子 PRNG 洗牌，翻页顺序稳定，F5/切换分类才重新随机
- **用户系统**：注册/登录（图形验证码 + IP 限流 + 保留用户名拦截）、修改用户名/密码
- **个人中心** `/user`：我的投稿（单条/批量，含失败原因展示）、我的收藏、意见反馈工单（申请关闭）
- **批量导入**：粘贴 JSON 或 `标题|正文|标签|日期` 竖线分隔文本，格式自动识别、逐条校验、相似度去重跳过

### 投稿审核（fail-closed，唯一路径）
所有投稿（单条/批量/修改）统一走机审编排 `runReview`：

1. 落库为 `pending`
2. 关键词硬规则（后台可开关与配置屏蔽词）→ 命中直接 `rejected`
3. AI 审核（OpenAI 兼容接口，后台可配置 baseURL/model/key/提示词）→ 三态：
   - `passed: true` → `approved` 自动上架
   - `passed: false` → `rejected` 自动拒绝，原因回显给投稿用户
   - `passed: "uncertain"` / AI 未配置 / 网络失败 / 返回不可解析 → 保持 `pending` 转人工

**任何异常一律转人工，绝不默认放行。** 人工审核在管理后台完成，也支持一键全量机审。

### 管理后台 `/admin`
账号密码来自 `.env`（`ADMIN_USERNAME` / `ADMIN_PASSWORD`），登录签发 JWT 存 httpOnly cookie。
- 文案管理：上架/下架/编辑/删除/批量删除、重复文案检测、人工审核（拒绝时可选常见原因 + 自定义回复）
- 类目管理：增删改（含文案的类目删除会被拦截，防级联丢失）
- 一键机审：扫描全部待审文案走 `runReview`
- 审核日志：关键词/AI 审核记录（含 uncertain 转人工）
- 反馈工单：回复/关闭/删除
- 站点设置：站点名称、图标上传、SEO 关键词描述、页脚、审核开关与屏蔽词、AI 配置（改完实时生效，30 秒缓存自动失效）

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | Next.js 16.3.5（App Router + Turbopack）+ React 19 |
| 语言 | TypeScript（strict） |
| UI | Tailwind CSS v4 + shadcn/ui（base-nova 风格，底层 @base-ui/react）+ lucide-react |
| 数据库 | PostgreSQL（pg 8.23 连接池） |
| 认证 | JWT（jose）httpOnly cookie；用户/管理员双 cookie 分离 |
| 密码哈希 | scrypt + salt + timingSafeEqual |
| 包管理 | pnpm |

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制模板并填写：

```bash
cp .env.example .env
```

```ini
# PostgreSQL 连接串
DATABASE_URL=postgres://用户名:密码@localhost:5432/数据库名

# 管理员账号（/admin 登录用）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me

# JWT 签名密钥（泄露需立即更换），生成方式：
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=replace-with-random-secret

# 登录态有效期（Nd 天 / Nh 小时 / Nm 分钟）
ADMIN_TOKEN_TTL=7d
USER_TOKEN_TTL=7d

# 用户批量投稿冷却时间（默认 1h）
USER_BATCH_COOLDOWN=1h

# HTTPS 部署设为 true；本地 http 调试保持 false
# 注意：true 时经 http://192.168.x.x 等纯 HTTP 访问会无法登录（localhost 不受影响）
COOKIE_SECURE=false
```

### 3. 初始化数据库

确保 PostgreSQL 可连接后执行建表脚本：

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

脚本幂等（`CREATE TABLE IF NOT EXISTS`），包含以下表（统一 `wenan_` 前缀）：

| 表 | 用途 |
|---|---|
| `wenan_users` | 用户（scrypt 密码哈希） |
| `wenan_categories` | 文案分类 |
| `wenan_copy_items` | 文案（`user_id IS NULL` 为公共预置；tags 为原生 `TEXT[]`） |
| `wenan_user_favorites` | 用户 × 文案 收藏关联表 |
| `wenan_feedbacks` | 反馈工单 |
| `wenan_site_settings` | 站点设置键值表 |

### 4. 启动

```bash
# 开发
pnpm dev

# 生产
pnpm build
pnpm start
```

访问 `http://localhost:3000` 为前台，`/admin` 为管理后台，`/user` 为个人中心。

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 开发服务器（Turbopack） |
| `pnpm build` | 生产构建 |
| `pnpm start` | 生产运行 |
| `pnpm lint` | ESLint 检查 |
| `pnpm exec tsc --noEmit` | TypeScript 类型检查 |

## 项目结构

```
app/                 # App Router 页面与 API 路由
  api/user/*         # 用户侧接口（投稿/收藏/反馈/账号）
  api/admin/*        # 管理接口（审核/设置/上传，全部先验管理员）
  admin/ user/       # 后台与个人中心页面（服务端守卫重定向）
components/
  library/           # 前台业务组件
  admin/ user/       # 后台/个人中心组件
  ui/                # shadcn 生成的基础组件（勿随意修改）
lib/
  db.ts              # pg 连接池 + query 封装（server-only）
  copywriting.ts     # 类型定义与配色映射（不含数据）
  copywriting-data.ts# 数据访问层
  review-engine.ts   # 机审编排 runReview（关键词 → AI，三态）
  auth.ts            # JWT 签发/校验、密码哈希
  captcha.ts         # 图形验证码（一次性 token）
  rate-limit.ts      # 内存滑动窗口限流
  site-settings.ts   # 站点设置（30 秒缓存）
  similarity.ts      # 投稿相似度去重（Sørensen–Dice bigram）
db/schema.sql        # 建表脚本
```

## 部署要点（HTTPS）

1. 服务器 `.env` 设置 `COOKIE_SECURE=true`，登录 cookie 仅经 HTTPS 传输
2. nginx 反代必须覆写真实 IP，否则伪造请求头可绕过登录限流：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
# 不要用 $proxy_add_x_forwarded_for（会追加客户端可伪造的头）
```

3. `JWT_SECRET` 使用独立随机值，不要复用本地调试的
4. AI 审核 key 建议存后台「站点设置」（wenan_site_settings），改 key 无需重启

## 安全说明

- 全部 SQL 使用参数绑定，无字符串拼接注入面
- 写接口第一行校验会话（admin/user cookie 分离，JWT 校验 role），数据层操作均带 `user_id` 归属条件防越权
- 上传接口扩展名由 MIME 白名单推导，忽略客户端文件名；限 2MB
- 验证码 token 一次性使用，答错也消耗，防重放与逐次猜测
- 机审 fail-closed：AI 任何异常转人工 pending，绝不默认放行
- 限流/冷却/验证码状态存内存，适用于单实例部署；多实例需换 Redis
