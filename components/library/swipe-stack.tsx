"use client";

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Heart, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { SwipeCard } from "@/components/library/swipe-card";
import { Button } from "@/components/ui/button";
import type { Category, CopyItem } from "@/lib/copywriting";

/** 右滑判定阈值（相对位移）与速度（px/s） */
const EXIT_X = 140;
const EXIT_VELOCITY = 500;
/** 飞出距离：保证卡片完全离开视口 */
const FLY_OUT = 760;

interface SwipeStackProps {
  items: CopyItem[];
  categories: Category[];
  isLoggedIn: boolean;
  siteName: string;
}

export function SwipeStack({
  items,
  categories,
  isLoggedIn,
  siteName,
}: SwipeStackProps) {
  const router = useRouter();
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // 卡片队列：首张是当前卡，依次叠放
  const [deck, setDeck] = useState<CopyItem[]>(items);
  // 当前卡的方向提示（favorite / skip / null）
  const [hint, setHint] = useState<"favorite" | "skip" | null>(null);
  // 未登录收藏提示（3 秒后消失）
  const [loginHint, setLoginHint] = useState(false);
  const [saving, setSaving] = useState(false);
  // 飞出动画锁：动画期间禁止二次拖拽/连滑（防断触）
  const flyingRef = useRef(false);

  const x = useMotionValue(0);
  // 跟手旋转（悬停/退回时随位移变化，未过阈值松手回弹）
  const rotate = useTransform(x, [-EXIT_X, 0, EXIT_X], [-14, 0, 14]);

  const current = deck[0];
  const next1 = deck[1];
  const next2 = deck[2];

  /** 右滑收藏：未登录给出引导提示，不推进 */
  async function handleFavorite() {
    if (!current || flyingRef.current) return;
    if (!isLoggedIn) {
      setLoginHint(true);
      window.setTimeout(() => setLoginHint(false), 3000);
      return;
    }
    flyingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyId: current.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (res.status === 401) {
          setLoginHint(true);
          window.setTimeout(() => setLoginHint(false), 3000);
          return;
        }
        throw new Error(data?.error ?? "收藏失败");
      }
      // 收藏成功后向右飞出，再切下一张
      await animate(x, FLY_OUT, {
        type: "spring",
        stiffness: 320,
        damping: 28,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      flyingRef.current = false;
      advance();
    }
  }

  /** 左滑跳过：向左飞出后再切卡 */
  async function handleSkip() {
    if (!current || flyingRef.current) return;
    flyingRef.current = true;
    await animate(x, -FLY_OUT, {
      type: "spring",
      stiffness: 320,
      damping: 28,
    });
    flyingRef.current = false;
    advance();
  }

  /** 推进：丢弃当前卡（SSR 语义列表仍保留全部内容供 SEO/读屏） */
  function advance() {
    setDeck((prev) => prev.slice(1));
    x.set(0);
    setHint(null);
  }

  /** 拖拽结束判定：悬停（未过阈值）由 dragSnapToOrigin 回弹；过阈值才飞出 */
  function handleDragEnd(
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } }
  ) {
    if (info.offset.x > EXIT_X || info.velocity.x > EXIT_VELOCITY) {
      void handleFavorite();
    } else if (
      info.offset.x < -EXIT_X ||
      info.velocity.x < -EXIT_VELOCITY
    ) {
      void handleSkip();
    }
  }

  /** 键盘：← 跳过，→ 收藏 */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") void handleSkip();
      else if (e.key === "ArrowRight") void handleFavorite();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isLoggedIn, saving]);

  /** 防浏览器历史滑动/后退手势：横向移动超过 10px 时阻止默认行为，
   *  避免 iOS 边缘返回手势 / Android 横滑手势被误触发（页面无横向滚动，仅卡片拖拽需要横移） */
  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      if (flyingRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - (lastX.current ?? t.clientX));
      if (dx > 10) e.preventDefault();
      lastX.current = t.clientX;
    }
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => window.removeEventListener("touchmove", onTouchMove);
  }, []);

  const lastX = useRef<number | null>(null);

  function reshuffle() {
    router.refresh();
  }

  if (!current) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 rounded-3xl border bg-card px-6 py-16 text-center shadow-xl">
        <Heart className="size-10 text-rose-400" />
        <div>
          <h2 className="text-lg font-semibold">今天看完啦</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            换一批新文案，或去 {siteName} 列表页慢慢逛
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reshuffle}>
            <RefreshCw />
            换一批
          </Button>
          <Button size="sm" onClick={() => router.push("/home")}>
            去列表页
          </Button>
        </div>
      </div>
    );
  }

  const category = categoryMap.get(current.categoryId);
  const nextCategory1 = next1 ? categoryMap.get(next1.categoryId) : undefined;
  const nextCategory2 = next2 ? categoryMap.get(next2.categoryId) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-4">
      {/* 交互区：黄金比例卡片（3:4），高度上限 70dvh，垂直居中 */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="relative aspect-[3/4] max-h-[70dvh] w-full max-w-[min(28rem,calc(70dvh*0.75))]">
          {/* 第三层 */}
          {next2 && (
            <div className="absolute inset-0 scale-[0.9] opacity-50">
              <SwipeCard
                item={next2}
                categoryLabel={nextCategory2?.label ?? "未分类"}
                categoryColor={nextCategory2?.color ?? "#94a3b8"}
              />
            </div>
          )}
          {/* 第二层 */}
          {next1 && (
            <motion.div
              className="absolute inset-0 scale-[0.95] opacity-80"
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 0.95, y: 8 }}
            >
              <SwipeCard
                item={next1}
                categoryLabel={nextCategory1?.label ?? "未分类"}
                categoryColor={nextCategory1?.color ?? "#94a3b8"}
              />
            </motion.div>
          )}

          {/* 当前层：可拖拽；未过阈值松手回弹（悬停/退回），过阈值飞出 */}
          {current && (
            <motion.div
              className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
              style={{ x, rotate }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              dragSnapToOrigin
              onDragStart={() => {
                setHint(null);
                flyingRef.current = false;
              }}
              onDrag={(_, info) => {
                const dx = info.offset.x;
                setHint(dx > 40 ? "favorite" : dx < -40 ? "skip" : null);
              }}
              onDragEnd={handleDragEnd}
            >
              <SwipeCard
                item={current}
                categoryLabel={category?.label ?? "未分类"}
                categoryColor={category?.color ?? "#94a3b8"}
              />
              {/* 拖拽方向提示：右滑收藏（绿） / 左滑跳过（红） */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute top-8 left-4 rounded-lg border-2 border-emerald-500 bg-background/60 px-3 py-1 text-sm font-bold tracking-widest text-emerald-500 uppercase backdrop-blur-sm"
                animate={{
                  opacity: hint === "favorite" ? 1 : 0,
                  scale: hint === "favorite" ? 1 : 0.9,
                  rotate: -8,
                }}
              >
                收藏
              </motion.span>
              <motion.span
                aria-hidden
                className="pointer-events-none absolute top-8 right-4 rounded-lg border-2 border-rose-500 bg-background/60 px-3 py-1 text-sm font-bold tracking-widest text-rose-500 uppercase backdrop-blur-sm"
                animate={{
                  opacity: hint === "skip" ? 1 : 0,
                  scale: hint === "skip" ? 1 : 0.9,
                  rotate: 8,
                }}
              >
                跳过
              </motion.span>
            </motion.div>
          )}
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="flex shrink-0 items-center justify-center gap-8 pt-4">
        <Button
          variant="outline"
          size="icon"
          aria-label="跳过（左滑）"
          className="size-14 rounded-full border-rose-200 text-rose-500 shadow-md hover:bg-rose-500/10 hover:border-rose-400 dark:border-rose-500/30"
          onClick={() => void handleSkip()}
          disabled={saving}
        >
          <X className="size-6" />
        </Button>
        <Button
          size="icon"
          aria-label="收藏（右滑）"
          className="size-14 rounded-full border-emerald-200 bg-emerald-500 text-white shadow-md hover:bg-emerald-600 dark:border-emerald-500/30"
          onClick={() => void handleFavorite()}
          disabled={saving}
        >
          <Heart className="size-6" />
        </Button>
      </div>
      <p className="shrink-0 pt-2 text-center font-mono text-[11px] text-muted-foreground/60">
        左滑跳过 · 右滑收藏 · 剩余 {deck.length}
      </p>

      {/* 未登录收藏提示 */}
      <motion.div
        className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center"
        animate={{ opacity: loginHint ? 1 : 0, y: loginHint ? 0 : -8 }}
      >
        {loginHint && (
          <button
            type="button"
            onClick={() => router.push("/user/login")}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg"
          >
            <Heart className="size-4" />
            登录后即可收藏，点击去登录
          </button>
        )}
      </motion.div>

      {/* SEO/读屏语义列表：完整展示全部卡片内容（对搜索引擎可见，交互层不影响） */}
      <ul className="sr-only" aria-label="推荐文案列表">
        {deck.map((item) => (
          <li key={item.id}>
            <a href={`/copy/${item.id}`}>
              {item.title}：{item.content}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
