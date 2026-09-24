"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Loader2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MyCopyItem } from "@/lib/copywriting";
import { useMyList } from "@/components/user/use-my-list";

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

function MiniCard({
  item,
  selectMode,
  selected,
  onToggleSelect,
  onUnfavorite,
}: {
  item: MyCopyItem;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUnfavorite: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyText(item.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-full flex-col gap-1.5 rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 text-xs">
        {selectMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`选择 ${item.title}`}
            className="size-4 accent-primary"
          />
        )}
        <span className="truncate text-muted-foreground">
          {item.categoryLabel}
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground">
          {item.updatedAt}
        </span>
      </div>

      <div className="truncate text-sm font-medium">{item.title}</div>
      <p className="line-clamp-2 flex-1 text-xs leading-5 text-muted-foreground">
        {item.content}
      </p>

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="取消收藏"
            onClick={() =>
              selectMode ? onToggleSelect(item.id) : onUnfavorite(item.id)
            }
          >
            <Star className="fill-amber-400 text-amber-400" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="复制" onClick={handleCopy}>
            {copied ? (
              <Check className="text-emerald-600" />
            ) : (
              <Copy />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FavoritesPanel() {
  const list = useMyList("/api/user/favorites");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected =
    list.items.length > 0 && list.items.every((i) => selected.has(i.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        list.items.forEach((i) => next.delete(i.id));
        return next;
      }
      const next = new Set(prev);
      list.items.forEach((i) => next.add(i.id));
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleBatchRemove() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await list.bulkRemove([...selected]);
      exitSelectMode();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleSingleUnfavorite(id: string) {
    try {
      await list.bulkRemove([id]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">共 {list.total} 条收藏</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        >
          {selectMode ? "完成" : "批量管理"}
        </Button>
      </div>

      {selectMode && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="size-4 accent-primary"
            />
            全选本页
          </label>
          <span className="text-muted-foreground">已选 {selected.size} 项</span>
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto"
            disabled={selected.size === 0 || busy}
            onClick={handleBatchRemove}
          >
            {busy && <Loader2 className="animate-spin" />}
            取消收藏
          </Button>
        </div>
      )}

      {list.loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </div>
      ) : list.items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          还没有收藏内容，去首页发现喜欢的文案吧
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.items.map((item) => (
            <MiniCard
              key={item.id}
              item={item}
              selectMode={selectMode}
              selected={selected.has(item.id)}
              onToggleSelect={toggleSelect}
              onUnfavorite={handleSingleUnfavorite}
            />
          ))}
        </div>
      )}

      {list.paged && list.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={list.page <= 1 || list.loading}
            onClick={() => {
              setSelected(new Set());
              list.setPage(list.page - 1);
            }}
          >
            <ChevronLeft />
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {list.page} / {list.totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={list.page >= list.totalPages || list.loading}
            onClick={() => {
              setSelected(new Set());
              list.setPage(list.page + 1);
            }}
          >
            下一页
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
