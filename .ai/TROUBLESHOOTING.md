# TROUBLESHOOTING.md — 已确认的重复问题

> **读取时机：** Debug 或修改与已知问题相关的行为时读取本文件。
>
> 只保存已确认、会重复出现、且不易发现的问题——每条都带已验证的解决方案。
> 不要保存原始日志、一次性错误或临时环境问题。
> 每个问题一条；已有记录时更新，而不是新增重复条目。

## 切换主题后侧栏底部 UI（主题切换按钮 / 用户登录卡）状态丢失

- **症状：** 切到霓虹彩蛋主题后，桌面侧边栏底部的主题切换按钮与用户登录卡"跑丢"；移动端 sheet 弹层被撑到文档高度（实测约 11564px），底部在视口外。
- **根本原因：** 霓虹主题给 `body` 加了 `filter: hue-rotate(...)` 动画；`filter`（以及 `transform`、`backdrop-filter`）会使该元素成为其 `fixed` 后代的**定位包含块**。原本相对视口定位的 fixed 侧栏 / sheet 改为相对 body，滚动后位置错乱。
- **已验证的解决方案：** 移除 body 上的 filter / transform 动画，霓虹动效改用 `background-position`（background-size 200%）/ `text-shadow` / `opacity`；并在 globals.css 写死注释"不要给 body 加 filter/transform"。
- **验证方式：** 浏览器桌面 + 移动端（CDP 模拟移动视口）实测切主题后侧栏 / sheet 底部 UI 始终可见。
- **适用版本 / 环境 / 条件：** 所有主题 / 全屏 fixed 布局；任何在 body 或 fixed 元素祖先上加 filter/transform 的改动。

## 直接 SQL 改站点设置后页面不生效

- **症状：** 直接 `UPDATE wenan_site_settings` 后，首页 / SEO 仍旧值，等待后才变化。
- **根本原因：** `getSiteSettings()` 有 30 秒内存缓存，只有经 `updateSiteSettings()`（admin 设置 API / UI 保存）才会主动置空缓存；裸 SQL 不触发失效。
- **已验证的解决方案：** 业务配置一律走 admin「站点设置」保存；确需直接改库时，改完重启服务（`pkill -f next-server && pnpm start`）或等 30s。
- **验证方式：** 直接改库后 curl 首页仍旧值 → 重启后 curl 为新值。
- **适用版本 / 环境 / 条件：** 所有读取站点设置的服务端路径。

## Sheet 弹层内文字 / 输入框紧贴侧边栏边框

- **症状：** 新建 / 编辑弹层（曾出现在公告、更早的新建文案）中标题、输入框、按钮紧贴 sheet 边缘，无左右间距。
- **根本原因：** `components/ui/sheet.tsx` 的 `SheetContent` **无默认内边距**（仅 `flex flex-col gap-4`），需使用方自行加 padding。
- **已验证的解决方案：** 给 `SheetHeader`、`SheetFooter` 加 `px-5`；中间内容区用 `flex flex-1 flex-col gap-* overflow-y-auto px-5 py-5`（footer 固定底部、内容超长滚动）。
- **验证方式：** `getComputedStyle` 实测 Header / 内容 / Footer 的 padding-left 均为 20px；截图确认。
- **适用版本 / 环境 / 条件：** 所有使用 SheetContent 的弹层。

## 首页 / 页面标题不随后台站点设置变化

- **症状：** 后台改了站名或标题后缀，首页 `<title>` 仍是旧文案。
- **根本原因：** 页面 `generateMetadata` 把标题写死（如首页曾写死"精选文案灵感库 · 一键复制"），覆盖了根 layout 基于站点设置的 title 模板。
- **已验证的解决方案：** 页面 `generateMetadata` 中用 `getSeoContext()` 读取设置，标题拼 `${siteName} - ${settings.site_title_suffix}`（或通过 `buildSeoMetadata` 传入）；JSON-LD 的 name 同步。
- **验证方式：** 后台改后缀保存 → curl 首页 `<title>` 即时为新值。
- **适用版本 / 环境 / 条件：** 所有希望标题跟随后台设置的页面；禁止在 page 中写死站名 / 后缀。

## 站点设置上传图片后不显示（404 / 无效）

- **症状：** 后台上传 favicon / logo / OG 图返回成功，但页面图片不显示，直接访问 URL 为 404。
- **根本原因：** 文件原写入 `public/uploads`，而 Next 生产模式（next start）只在**构建时**固化 public 静态清单，运行时新增文件不会被服务（dev 模式正常，掩盖了问题）。
- **已验证的解决方案：** 上传改写到项目根持久目录 `storage/uploads`（.gitignore 忽略），由 Route Handler `app/uploads/[filename]/route.ts` 读取，路径仍为 `/uploads/<uuid>.<ext>`；Handler 做 basename + 扩展名白名单（防穿越）、nosniff、immutable 缓存，SVG 加 restrictive CSP 防存储型 XSS。
- **验证方式：** curl 上传 → GET /uploads/xxx 返回 200 + image/*；穿越 payload 返回 404。
- **适用版本 / 环境 / 条件：** 所有生产部署；不得回退到运行时写 public。

## 首页跑马灯左右两端出现白边 / 缺口

- **症状：** 深色跑马灯条左右两端透出页面背景（浅色主题下呈白边）。
- **根本原因：** mask-image 直接加在整条容器上，连深色背景一起在两端 4% 渐隐。
- **已验证的解决方案：** 背景条（外层）不做 mask、完整铺满；mask 只加在内层「滚动文字」的 overflow 容器上。
- **验证方式：** 截图确认背景条左右铺满、仅文字边缘渐隐。
- **适用版本 / 环境 / 条件：** 所有带边缘渐隐的通栏组件。
