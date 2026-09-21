import type { ReactNode } from "react";
import { BookMarked } from "lucide-react";

/**
 * 登录 / 注册页共用布局（简约科技风）：
 * 深色底 + 细网格 + 青蓝光斑 + 深色玻璃卡片
 */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* 细网格背景 */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        aria-hidden
      />
      {/* 青蓝光斑 */}
      <div className="pointer-events-none absolute -top-32 left-1/4 size-96 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[28rem] rounded-full bg-blue-600/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-white">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/25">
            <BookMarked className="size-5" />
          </div>
          <span className="text-base font-semibold tracking-wide">
            简心文案库
          </span>
          <span className="mt-0.5 rounded border border-white/15 px-1.5 py-0.5 text-[10px] tracking-widest text-slate-400 uppercase">
            Console
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-5 flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
