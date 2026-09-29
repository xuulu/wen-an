# 简心文案库 · API 接口文档

> 适用：微信小程序 / 第三方客户端调用
> 基础地址：`https://wenan.qvqa.cn`（以后台「站点设置 → 站点域名」为准）
> 数据格式：请求与响应均为 `application/json; charset=utf-8`
> 更新时间：2026-09-29（与仓库 `main` 分支当前代码一致）

---

## 0. 调用约定（小程序必读）

### 0.1 鉴权方式

本项目使用 **httpOnly Cookie 会话**（不是 Bearer Token）：

| 角色 | Cookie 名 | 来源 |
|---|---|---|
| 普通用户 | `wenan_user_token` | `POST /api/user/register`、`POST /api/user/login` 成功时 `Set-Cookie` |
| 管理员 | `wenan_admin_token` | `POST /api/auth/login` 成功时 `Set-Cookie` |

**小程序注意**：`wx.request` 默认**不会自动携带** Cookie。两种做法任选：

1. 手动管理：从登录响应的 `Set-Cookie` 里取出 `wenan_user_token=xxx` 保存（如存到 storage），之后每个请求在 `header` 里带上：
   ```js
   header: { 'Cookie': `wenan_user_token=${token}`, 'Content-Type': 'application/json' }
   ```
2. 若服务端改为支持 `Authorization: Bearer <token>`，需要额外改代码（当前版本不支持，如需要可提出改造）。

### 0.2 错误响应

非 2xx 时统一返回：

```json
{ "error": "错误说明" }
```

部分接口附带额外字段（如 `captchaFailed`、`retryAfter`、`protected` 等，见各接口）。

### 0.3 限流（返回 429 + Retry-After 头）

| 接口 | 限流策略 |
|---|---|
| 注册 | 每 IP 5 次 / 小时 |
| 登录（用户 / 管理员） | 每 IP 10 次 / 15 分钟 |
| 投稿 | 每用户 30 次 / 小时 |
| 批量投稿 | 每用户 2 次 / 小时（另有后台可配冷却期） |
| 批量删除投稿 / 注销 | 每用户 10 次 / 3 次 / 小时 |
| 提交反馈 | 每用户 5 次 / 小时 |
| 修改资料 | 每用户 10 次 / 小时 |

429 响应示例：`{ "error": "请求过于频繁，请稍后再试" }`，响应头 `Retry-After: 60`。

### 0.4 通用说明

- 文案列表、分类、公告为**公开接口**，无需登录。
- `GET /api/copy` 带登录 Cookie 时，每条文案会多返回 `favorite`（当前用户是否已收藏）；未登录时为 `false`。
- **文案详情没有独立的公开 GET 接口**：列表接口已返回完整 `content` 全文，小程序用列表数据即可渲染详情；如需单独的详情接口可提需求。
- 用户昵称获取：登录/注册响应自带 `nickname`；他人昵称见文案的 `authorName` 字段。

---

## 1. 验证码

### 获取图形验证码

- `GET /api/captcha`
- 鉴权：无
- 响应 `200`：
  ```json
  {
    "token": "eyJhbGciOi...",   // 提交注册/登录时原样回传
    "svg": "<svg ...>...</svg>" // 图形验证码 SVG 字符串
  }
  ```
- 说明：每次调用生成新的验证码；同一 token 5 分钟内有效且只能用一次。小程序可直接用 `<image src="data:image/svg+xml;base64,...">` 或请求时转 base64 渲染。

---

## 2. 注册 / 登录 / 退出

### 注册

- `POST /api/user/register`
- 鉴权：无（需先获取验证码）
- Body：
  ```json
  {
    "nickname": "昵称2-20字符",
    "password": "密码至少6位",
    "captchaToken": "验证码token",
    "captchaAnswer": "验证码答案"
  }
  ```
- 成功 `201`：
  ```json
  { "id": 42, "nickname": "昵称" }
  ```
  同时 `Set-Cookie: wenan_user_token=...`（自动登录）。
- 错误：
  - `400` 用户名长度/保留字、密码太短、验证码错误（附 `captchaFailed: true`）
  - `409` 用户名已被占用
  - `429` 注册过于频繁

### 登录

- `POST /api/user/login`
- 鉴权：无（需先获取验证码）
- Body：
  ```json
  {
    "nickname": "昵称",
    "password": "密码",
    "captchaToken": "验证码token",
    "captchaAnswer": "验证码答案"
  }
  ```
- 成功 `200`：
  ```json
  { "id": 42, "nickname": "昵称" }
  ```
  同时 `Set-Cookie: wenan_user_token=...`。
- 错误：
  - `400` 参数缺失 / 验证码错误
  - `401` 用户名或密码错误
  - `403` 账号已注销
  - `429` 尝试过于频繁

### 退出

- `POST /api/user/logout`
- 鉴权：无（清空 Cookie）
- 成功 `200`：`{ "ok": true }`

---

## 3. 公开数据接口（无需登录）

### 文案列表（支持搜索 / 分类 / 分页 / 随机）

- `GET /api/copy`
- 鉴权：无（带用户 Cookie 可返回收藏态）
- Query 参数：

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `page` | int | 1 | 页码（从 1 开始） |
| `pageSize` | int | 10 | 每页条数，最大 100 |
| `categoryId` | string | `all` | 分类 id；`all` 或具体 id |
| `search` | string | - | 关键词（匹配标题/正文/类目名） |
| `sort` | string | `updated` | `updated`（按更新时间倒序）或 `random`（随机） |
| `seed` | int | - | 仅 `sort=random` 时生效，固定随机种子 |

- 成功 `200`：
  ```json
  {
    "items": [
      {
        "id": "1737",
        "title": "标题",
        "content": "正文全文……",
        "categoryId": "15",
        "favorite": false,
        "status": "approved",
        "updatedAt": "2026-09-24",
        "authorId": "4",          // 用户投稿才有
        "authorName": "qvqa"      // 用户投稿才有
      }
    ],
    "total": 152
  }
  ```
- 说明：非管理员始终只返回 `status=approved` 的文案。

### 分类列表

- `GET /api/categories`
- 鉴权：无
- 成功 `200`：
  ```json
  [
    { "id": "13", "label": "雷霆文案", "color": "#eab308", "sortOrder": 0 }
  ]
  ```
- 响应头：`Cache-Control: public, max-age=300`（可缓存 5 分钟）。

### 公告列表

- `GET /api/announcements`
- 鉴权：无
- 成功 `200`：
  ```json
  {
    "items": [
      {
        "id": "1",
        "title": "公告标题",
        "content": "公告内容",
        "isHidden": false,
        "isPinned": true,
        "createdByName": "qvqa",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "updatedAt": "2026-09-20T10:00:00.000Z"
      }
    ],
    "total": 3
  }
  ```
- 说明：只返回未隐藏公告，置顶优先、时间倒序。

---

## 4. 投稿相关（需登录）

### 单条投稿

- `POST /api/user/copy`
- 鉴权：用户
- Body：
  ```json
  {
    "title": "标题（≤ 80 字）",
    "content": "正文（5-5000 字）",
    "categoryId": "1"
  }
  ```
- 成功 `201`：返回 `CopyItem`（同列表项结构），`status` 可能为：
  - `approved`：AI/关键词机审直接通过，已上架（附 `reviewReason`）
  - `rejected`：机审直接拒绝（附 `reviewReason` 原因）
  - `pending`：转人工审核（保持待审）
- 错误：`400` 参数缺失 / 长度不符 / 与已有文案相似度过高（返回相似标题与百分比）、`401` 未登录、`429` 投稿频繁

### 修改自己的投稿

- `PUT /api/user/copy/{id}`
- 鉴权：用户（仅本人投稿）
- Body：同单条投稿 `{ title, content, categoryId }`
- 成功 `200`：`{ "ok": true, "status": "approved" | "pending" }`
- 说明：新内容同样走机审；被拒则返回 `400` 且不改动原内容。

### 批量投稿（一次最多 500 条）

- `POST /api/user/copy/batch`
- 鉴权：用户
- Body：
  ```json
  {
    "categoryId": "1",
    "items": [
      { "title": "标题1", "content": "正文1" },
      { "title": "标题2", "content": "正文2" }
    ]
  }
  ```
- 成功 `200`：
  ```json
  {
    "inserted": 2,
    "skipped": [ { "index": 0, "title": "标题1", "score": 0.85, "similarTitle": "已存在的相似文案标题" } ],
    "errors": []
  }
  ```
  `skipped` = 相似度 ≥ 0.8 跳过的条目；`errors` = 写入失败条目。
- 错误：`429` 冷却期内（附 `retryAfter` 秒数）

### 我的投稿列表

- `GET /api/user/submissions`
- 鉴权：用户
- Query：`page` / `pageSize`（不传 `pageSize` 返回全部）
- 成功 `200`：`{ "items": CopyItem[], "total": n }`

### 批量删除投稿（进回收站）

- `DELETE /api/user/submissions`
- 鉴权：用户
- Body：
  ```json
  { "ids": ["1737", "1738"], "password": "登录密码", "confirm": true }
  ```
- 成功 `202`：
  ```json
  {
    "jobId": "job-uuid",
    "scheduled": 2,
    "protected": []   // 被收藏数 ≥ 阈值受保护的项
  }
  ```
- 说明：二次验证（密码 + confirm）；删除是异步执行（回收站保留 30 天可恢复）；被收藏数超过后台阈值的文案不会删除。

### 回收站列表

- `GET /api/user/submissions/recycle`
- 鉴权：用户
- Query：`page` / `pageSize`（默认每页 20）
- 成功 `200`：
  ```json
  { "items": [...], "total": 3, "page": 1, "pageSize": 20, "graceDays": 30 }
  ```

### 恢复回收站投稿

- `POST /api/user/submissions/restore`
- 鉴权：用户
- Body：`{ "ids": ["1737"] }`
- 成功 `200`：`{ "restored": 1 }`

---

## 5. 收藏相关（需登录）

### 收藏一条

- `POST /api/favorites`
- 鉴权：用户
- Body：`{ "copyId": "1737" }`（数字字符串）
- 成功 `200`：`{ "favorite": true }`（重复收藏幂等，无副作用）

### 取消收藏

- `DELETE /api/favorites?copyId=1737`
- 鉴权：用户
- 成功 `200`：`{ "favorite": false }`

### 我的收藏列表

- `GET /api/user/favorites`
- 鉴权：用户
- Query：`page` / `pageSize`（不传 `pageSize` 返回全部）
- 成功 `200`：`{ "items": CopyItem[], "total": n }`

### 批量取消收藏

- `DELETE /api/user/favorites`
- 鉴权：用户
- Body：`{ "ids": ["1737", "1738"] }`
- 成功 `200`：`{ "removed": 2 }`

---

## 6. 反馈相关（需登录）

### 我的反馈列表

- `GET /api/feedbacks`
- 鉴权：用户
- 成功 `200`：
  ```json
  {
    "items": [
      {
        "id": "3",
        "userId": "42",
        "username": "昵称",
        "type": "suggestion",          // bug | suggestion | complaint | other
        "content": "反馈内容",
        "contact": "联系方式",
        "adminReply": "管理员回复（未回复为空）",
        "status": "pending",           // pending | replied | closed
        "createdAt": "2026-09-20T10:00:00.000Z"
      }
    ],
    "total": 1
  }
  ```

### 提交反馈

- `POST /api/feedbacks`
- 鉴权：用户
- Body：`{ "type": "suggestion", "content": "5-1000 字", "contact": "选填" }`
- 成功 `201`：返回 Feedback 对象
- 错误：`400` 类型不合法 / 内容长度不符、`429` 提交频繁

### 用户关闭自己的工单

- `PATCH /api/feedbacks`
- 鉴权：用户（仅本人）
- Body：`{ "id": "3" }`
- 成功 `200`：`{ "ok": true }`；不存在或已关闭返回 `404`

---

## 7. 账号相关（需登录）

### 修改昵称 / 密码

- `PATCH /api/user/profile`
- 鉴权：用户
- Body（至少一项）：
  ```json
  { "nickname": "新昵称", "currentPassword": "当前密码", "newPassword": "新密码" }
  ```
- 成功 `200`：`{ "ok": true }`
- 说明：改昵称需未被占用（`409`）；改密码需验证当前密码；成功后前端应清 Cookie 重新登录。
- 错误：`400` 无修改项 / 长度不符 / 当前密码错误、`429` 频繁

### 注销账号

- `POST /api/user/deactivate`
- 鉴权：用户
- Body：`{ "password": "登录密码", "confirm": true }`
- 成功 `202`：`{ "jobId": "...", "ok": true }`，立即作废登录 Cookie；已通过投稿保留但解除作者关联（匿名化），待审/被拒投稿软删，异步完成。

---

## 8. 管理员接口（小程序一般不需要，列全以便排查）

鉴权：`wenan_admin_token`（`POST /api/auth/login`，body `{ username, password }` 成功返回 `{ username, role: "admin" }`）。

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/auth/login` | POST | 管理员登录（返回 `{ username, role }` + Set-Cookie） |
| `/api/auth/logout` | POST | 管理员退出 |
| `/api/admin/settings` | GET/PUT | 站点设置读取 / 批量更新（`PUT` body `{ settings: {...} }`） |
| `/api/admin/announcements` | GET/POST | 公告列表（含隐藏）/ 新建（body `{ title, content, isHidden, isPinned }`） |
| `/api/admin/announcements/{id}` | PUT/DELETE | 修改 / 删除公告 |
| `/api/admin/ai-test` | POST | AI 接口连通性测试（返回 `{ ok, status, latencyMs, reply/error }`） |
| `/api/admin/review-logs` | GET | 审核日志 |
| `/api/admin/review-all` | POST | 全部待审一键机审 |
| `/api/admin/upload` | POST | 图片上传（multipart） |
| `/api/copy` | POST | 管理员新建公共文案 |
| `/api/copy/{id}` | PATCH/PUT/DELETE | 审核（`{ status: approved|rejected|pending, reason? }`）/ 更新 / 删除 |
| `/api/copy/batch` | POST | 管理员批量导入（body 同用户批量，返回 `{ inserted, skipped, errors }`） |
| `/api/copy/batch-delete` | POST | 批量删除（body `{ ids: [] }` → `{ deleted }`） |
| `/api/copy/duplicates` | GET | 库内重复文案检测 |
| `/api/feedbacks?scope=all` | GET | 全部反馈（管理员），`?status=pending|replied|closed|all` |
| `/api/feedbacks/{id}` | PATCH/DELETE | 回复（`{ reply }`）/ 关闭（`{ action: "close" }`）/ 删除 |
| `/api/cron/deletion-jobs` | GET | 定时维护（需 `Authorization: Bearer <CRON_SECRET>`） |

---

## 9. 小程序对接速查（最小可用流程）

```js
const BASE = 'https://wenan.qvqa.cn';

// 1. 拿验证码
const cap = await wxRequest(`${BASE}/api/captcha`);
// → { token, svg }

// 2. 注册 / 登录（保存 Set-Cookie 里的 wenan_user_token）
const login = await wxRequest(`${BASE}/api/user/login`, {
  method: 'POST',
  data: { nickname, password, captchaToken: cap.token, captchaAnswer }
});
// 成功 → { id, nickname }；保存 token

// 3. 每次请求带 Cookie
function wxRequest(url, opts = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: opts.method || 'GET',
      data: opts.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `wenan_user_token=${token}` } : {})
      },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(res.data);
        if (res.statusCode === 429) return reject({ code: 429, msg: res.data.error, retryAfter: res.header['Retry-After'] });
        reject({ code: res.statusCode, msg: (res.data && res.data.error) || '请求失败' });
      },
      fail: reject
    });
  });
}

// 4. 首页：分类 + 文案列表 + 公告
const cats = await wxRequest(`${BASE}/api/categories`);
const list = await wxRequest(`${BASE}/api/copy?page=1&pageSize=20`);
const anns = await wxRequest(`${BASE}/api/announcements`);

// 5. 详情：列表项已含 content 全文，直接渲染即可
// 6. 收藏 / 投稿 / 反馈：按上文接口调用
```

---

## 10. 版本说明

- 本文档对应仓库 `main` 分支 2026-09-29 提交 `1c809fc`。
- 新增/修改接口后需同步更新本文档（`docs/API.md`）。
