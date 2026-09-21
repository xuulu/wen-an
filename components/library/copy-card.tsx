"use client";

import { Check, Copy, Star } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  getCategoryStyle,
  type CopyItem,
} from "@/lib/copywriting";

interface CopyCardProps {
  item: CopyItem;
  categoryLabel: string;
  categoryColor: string;
  onToggleFavorite: (id: string) => void;
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

export function CopyCard({
  item,
  categoryLabel,
  categoryColor,
  onToggleFavorite,
}: CopyCardProps) {
  const [copied, setCopied] = useState(false);
  const style = getCategoryStyle(categoryColor);

  async function handleCopy() {
    await copyText(item.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="group/card relative flex h-full flex-col overflow-hidden pt-4 transition-shadow hover:shadow-md">
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={style.accent}
        aria-hidden
      />
      <CardHeader className="gap-2">
        {/* 第一行：标题左，收藏右 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 text-base leading-snug font-semibold">
            {item.title}
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={item.favorite ? "取消收藏" : "收藏"}
            className="size-9 shrink-0 text-muted-foreground group-hover/card:text-foreground data-[fav=true]:text-amber-500"
            data-fav={item.favorite}
            onClick={() => onToggleFavorite(item.id)}
          >
            <Star
              className={
                item.favorite
                  ? "fill-amber-400 text-amber-400"
                  : undefined
              }
            />
          </Button>
        </div>
        {/* 第二行：类目 + 日期 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
            style={style.badge}
          >
            {categoryLabel}
          </span>
          <span>{item.updatedAt}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-3 text-sm leading-6 text-foreground/80">
          {item.content}
        </p>
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handleCopy}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "已复制" : "复制"}
        </Button>
      </CardFooter>
    </Card>
  );
}
