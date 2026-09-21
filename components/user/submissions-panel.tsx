"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  PenLine,
  Trash2,
  Upload,
} from "lucide-react";

import { BatchImportSheet } from "@/components/library/batch-import-sheet";
import { CopyFormSheet } from "@/components/library/copy-form-sheet";
import { Button } from "@/components/ui/button";
import type { Category, CopyItem } from "@/lib/copywriting";
import {
  statusLabels,
  statusStyles,
} from "@/lib/copywriting";
import { useMyList } from "@/components/user/use-my-list";

export function SubmissionsPanel({ categories }: { categories: Category[] }) {
  const list = useMyList("/api/user/submissions");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CopyItem | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
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

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 条投稿吗？删除后不可恢复。`)) {
      return;
    }
    setBusy(true);
    try {
      await list.bulkRemove([...selected]);
      exitSelectMode();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleSingleDelete(id: string) {
    if (!confirm("确定删除这条投稿吗？")) return;
    try {
      await list.bulkRemove([id]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">共 {list.total} 条投稿</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            {selectMode ? "完成" : "批量管理"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBatchOpen(true)}
          >
            <Upload />
            批量投稿
          </Button>
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <PenLine />
            投稿文案
          </Button>
        </div>
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
            onClick={handleBatchDelete}
          >
            {busy && <Loader2 className="animate-spin" />}
            批量删除
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        {list.loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            还没有投稿，点击右上角「投稿文案」分享你的内容
          </div>
        ) : (
          list.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border-b px-3 py-2.5 text-sm last:border-b-0"
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={`选择 ${item.title}`}
                  className="size-4 shrink-0 accent-primary"
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{item.title}</span>
                {item.status === "rejected" && item.reviewReason && (
                  <span className="truncate text-xs text-muted-foreground">
                    拒绝原因：{item.reviewReason}
                  </span>
                )}
              </span>
              <span className="hidden shrink-0 text-muted-foreground sm:inline">
                {item.categoryLabel}
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}
              >
                {statusLabels[item.status]}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground md:block">
                {item.updatedAt}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="编辑投稿"
                className="shrink-0"
                onClick={() => {
                  if (selectMode) toggleSelect(item.id);
                  else {
                    setEditingItem(item);
                    setSheetOpen(true);
                  }
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="删除投稿"
                className="shrink-0"
                onClick={() =>
                  selectMode
                    ? toggleSelect(item.id)
                    : handleSingleDelete(item.id)
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </div>

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

      <CopyFormSheet
        key={editingItem?.id ?? "new"}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingItem(null);
        }}
        categories={categories}
        initial={editingItem ?? undefined}
        actionUrl="/api/user/copy"
        editActionUrl="/api/user/copy"
        submitTitle="投稿文案"
        submitDescription="投稿提交后进入待审核，管理员通过后展示在首页。"
        editDescription="修改后将重新审核：通过后直接上架，未通过则保持原文案。"
        skipRouterRefresh
        onSaved={() => list.refresh()}
      />
      <BatchImportSheet
        open={batchOpen}
        onOpenChange={setBatchOpen}
        categories={categories}
        actionUrl="/api/user/copy/batch"
        mode="user"
      />
    </div>
  );
}
