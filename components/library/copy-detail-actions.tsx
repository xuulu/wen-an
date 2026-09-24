"use client";

import { Check, Copy, Link as LinkIcon, Share2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CopyDetailActionsProps {
  copyId: string;
  content: string;
  initialFavorite: boolean;
  isLoggedIn: boolean;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function CopyDetailActions({
  copyId,
  content,
  initialFavorite,
  isLoggedIn,
}: CopyDetailActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [linkCopied, setLinkCopied] = useState(false);
  const [favAnim, setFavAnim] = useState<"pop" | "shrink" | null>(null);

  async function handleCopy() {
    await copyText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleToggleFavorite() {
    if (!isLoggedIn) {
      router.push("/user/login");
      return;
    }

    const willFavorite = !favorite;
    setFavAnim(willFavorite ? "pop" : "shrink");
    window.setTimeout(() => setFavAnim(null), 420);
    setFavorite(willFavorite);
    try {
      if (willFavorite) {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ copyId }),
        });
        if (!res.ok) throw new Error("收藏失败");
      } else {
        const res = await fetch(
          `/api/favorites?copyId=${encodeURIComponent(copyId)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("取消收藏失败");
      }
    } catch {
      setFavorite(!willFavorite);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    // 优先调用系统分享面板；不支持（多数桌面浏览器）时退化为复制页面链接
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: document.title, url });
      } catch {
        // 用户取消分享会抛 AbortError，无需处理
      }
      return;
    }
    await copyText(url);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 复制主按钮（最左，恢复修改前的布局） */}
      <Button
        onClick={handleCopy}
        className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500"
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "已复制" : "一键复制"}
      </Button>
      <Button
        variant="outline"
        onClick={handleToggleFavorite}
        className="rounded-full px-4 data-[fav=true]:border-amber-500/40 data-[fav=true]:text-amber-600"
        data-fav={favorite}
      >
        <Star
          className={`${favorite ? "fill-amber-400 text-amber-400" : ""} ${
            favAnim === "pop"
              ? "fav-pop"
              : favAnim === "shrink"
                ? "fav-shrink"
                : ""
          }`}
        />
        {favorite ? "已收藏" : "收藏"}
      </Button>
      <Button
        variant="outline"
        onClick={handleShare}
        className="rounded-full px-4"
      >
        {linkCopied ? (
          <Check className="text-emerald-600" />
        ) : (
          <>
            <Share2 className="hidden sm:block" />
            <LinkIcon className="sm:hidden" />
          </>
        )}
        {linkCopied ? "链接已复制" : "分享"}
      </Button>
    </div>
  );
}
