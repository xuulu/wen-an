"use client";

import Link from "next/link";
import { Handshake, Sparkles } from "lucide-react";

/**
 * 首页顶部通栏跑马灯（GitHub 开源社区风格）
 *
 * 内容与速度由后台「站点设置 → 首页跑马灯」配置，服务端读表后传入：
 * - content：文案内容（纯文本，不嵌入 HTML，避免 XSS）
 * - speedSeconds：滚动一周时长（秒），经 CSS 变量 --marquee-duration 生效
 * - enabled=false 时整条不渲染
 *
 * 性能设计：
 * - 纯文本 + CSS 动画，零图片零请求，不参与 LCP 主体计算；
 * - 外层固定高度（h-9）+ overflow-hidden，内容单行不换行 → 无 CLS；
 * - 动画仅 transform，合成器线程执行，不触发布局/绘制；
 * - prefers-reduced-motion 时完全停用动画，静态展示文案；
 * - 组件无 state / 无 effect / 无事件监听，客户端开销可忽略。
 */
export function MarqueeBanner({
  enabled = true,
  content = "",
  speedSeconds = 32,
}: {
  enabled?: boolean;
  content?: string;
  speedSeconds?: number;
}) {
  if (!enabled) return null;

  // 多行内容合并为一行滚动（分隔符），空内容回退默认文案
  const line =
    content
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" · ") || "社区共建需要大家，欢迎注册投稿，为社区贡献一份力量。";
  const safeSpeed = Number.isFinite(speedSeconds) && speedSeconds > 0 ? speedSeconds : 32;

  return (
    <div
      className="relative flex h-9 w-full items-center border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-200"
      style={{ "--marquee-duration": `${safeSpeed}s` } as React.CSSProperties}
    >
      {/* 背景条完整铺满左右（不做 mask，否则两端渐隐会透出页面背景 = 白边）；
          mask 只加在内层滚动文字容器，让文字两端平滑进出。
          注意：内层是 absolute，不参与外层 flex 排列，必须自带 flex items-center
          才能让文字垂直居中（否则文字贴顶） */}
      <div className="absolute inset-0 flex items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
        {/* 无缝滚动：轨道 = 左右两个完全相同的半段，translateX(-50%) 循环 */}
        <div className="marquee-track flex w-max items-center whitespace-nowrap">
          <MarqueeGroup line={line} />
          <MarqueeGroup line={line} />
        </div>
      </div>
      {/* 无障碍静态副本：屏幕阅读器可读 */}
      <p className="sr-only">{line}</p>
    </div>
  );
}

/** 一个完整内容段（4 份文案 + 4 个加入按钮，保证任意视口宽度都铺满） */
function MarqueeGroup({ line }: { line: string }) {
  return (
    <span className="flex shrink-0 items-center">
      {Array.from({ length: 4 }, (_, i) => (
        <BannerItem key={i} line={line} />
      ))}
    </span>
  );
}

function BannerItem({ line }: { line: string }) {
  return (
    <span className="flex items-center gap-2 text-xs font-medium tracking-wide">
      <Sparkles className="size-3.5 shrink-0 text-amber-400" />
      {line}
      <span className="mx-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
        <Handshake className="size-3" />
        <Link
          href="/user"
          className="underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          立即加入
        </Link>
      </span>
    </span>
  );
}
