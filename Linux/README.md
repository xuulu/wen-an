# 生产环境 Nginx 配置目录（Linux）

本目录存放 wen-an 站点在生产 Linux 服务器上的 Nginx 配置。

## 文件

| 文件 | 说明 |
|---|---|
| `nginx/production.conf` | 生产环境 Nginx 主配置（HTTP→HTTPS 跳转 + HTTPS 主站 server 块），含中文注释 |

## 部署步骤

1. 将 `nginx/production.conf` 复制/软链到 `/etc/nginx/conf.d/wen-an.conf`；
2. 替换文件中的三处占位：`server_name`、`ssl_certificate`、`ssl_certificate_key`（与后台「站点设置 → 站点域名」保持一致）；
3. 校验并重载：

```bash
nginx -t && systemctl reload nginx
```

## 已转发的路径（新增路由/服务时必须同步维护！）

| 路径 | 类型 | 处理 |
|---|---|---|
| `/` 及所有页面路由 | 页面（App Router 动态渲染） | 转发 `127.0.0.1:3000` |
| `/_next/static/` | Next.js 构建静态产物 | 转发 + 1 年 immutable 缓存 |
| `/_next/image` | Next.js 内置图片优化 | 转发 + 24h 缓存 |
| `/api/*` | 业务 API（含注册/登录/投稿/限流/公告 `GET /api/announcements`、管理端 `GET|POST /api/admin/announcements`、`PUT|DELETE /api/admin/announcements/[id]`） | 转发，透传真实 IP（X-Forwarded-For） |
| `/uploads/*` | 用户上传图片（存项目根 `storage/uploads`，由 `app/uploads/[filename]` Route Handler 读取） | 转发，Handler 已带 immutable 缓存 / nosniff |
| `/sitemap.xml` | 动态生成（每日 revalidate） | 转发 + 86400 缓存 |
| `/robots.txt` | 动态生成 | 转发 + 86400 缓存 |
| WebSocket / SSE | 预留（当前无服务） | 见配置内 `location /` 的 upgrade 模板 |

## 维护约定（必读）

**以后每新增一个需要对外暴露的路由、目录或独立服务，都必须回到 `nginx/production.conf` 同步修改**，并在上表登记，否则线上会 404 / 502。改动后必须 `nginx -t` 校验再 reload。

> 注意：限流中间件依赖 `X-Forwarded-For` 获取访客真实 IP，删除 `proxy_set_header` 段落会导致全站匿名用户被限流中间件视为同一 IP。

## 定时任务（回收站清理 / 删除任务续跑）

`/api/cron/deletion-jobs` 负责物理删除过期回收站内容、续跑卡住的删除/注销任务，需带 `Authorization: Bearer <CRON_SECRET>`（CRON_SECRET 在 .env 配置）。建议用 crontab 每天调用一次：

```bash
crontab -e
# 每天 03:17 触发（替换为你的 CRON_SECRET）
17 3 * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" \
  http://127.0.0.1:3000/api/cron/deletion-jobs >/dev/null 2>&1
```

该路径已被 `location /api/` 覆盖转发，无需改 Nginx；但**新增其他内部 cron 路由时仍需回到上表登记**。
