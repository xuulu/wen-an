"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Megaphone,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  validateAnnouncementDraft,
  type Announcement,
  type AnnouncementDraft,
} from "@/lib/announcement";

const PAGE_SIZE = 10;

const emptyDraft: AnnouncementDraft = {
  title: "",
  content: "",
  isHidden: false,
  isPinned: false,
};

/** 管理员公告管理：增删改查 + 隐藏 + 置顶 */
export function AnnouncementManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const requestKey = `${page}:${reloadToken}`;
  const loading = loadedKey !== requestKey;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/announcements?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => res.json())
      .then((data: { items: Announcement[]; total: number }) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken, requestKey]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setError("");
    setSheetOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setDraft({
      title: item.title,
      content: item.content,
      isHidden: item.isHidden,
      isPinned: item.isPinned,
    });
    setError("");
    setSheetOpen(true);
  }

  async function handleSave() {
    const errorMsg = validateAnnouncementDraft(draft);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const url = editing
        ? `/api/admin/announcements/${editing.id}`
        : "/api/admin/announcements";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "保存失败，请重试");
        setBusy(false);
        return;
      }
      setSheetOpen(false);
      setReloadToken((t) => t + 1);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleHidden(item: Announcement) {
    const res = await fetch(`/api/admin/announcements/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        content: item.content,
        isHidden: !item.isHidden,
        isPinned: item.isPinned,
      }),
    });
    if (res.ok) setReloadToken((t) => t + 1);
  }

  async function handleTogglePinned(item: Announcement) {
    const res = await fetch(`/api/admin/announcements/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        content: item.content,
        isHidden: item.isHidden,
        isPinned: !item.isPinned,
      }),
    });
    if (res.ok) setReloadToken((t) => t + 1);
  }

  async function handleDelete(item: Announcement) {
    if (!window.confirm(`确定删除公告「${item.title}」？删除后不可恢复。`)) return;
    setDeleting(item.id);
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReloadToken((t) => t + 1);
        setPage((p) => Math.max(1, p));
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Megaphone className="size-4" />
            公告管理
          </h2>
          <p className="text-sm text-muted-foreground">
            共 {total} 条；隐藏的公告用户不可见，置顶的优先展示
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus />
          新建公告
        </Button>
      </div>

      <div className="flex flex-col divide-y">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            加载中…
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            暂无公告，点击「新建公告」发布第一条
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                      <Pin className="size-3" />
                      置顶
                    </span>
                  )}
                  {item.isHidden && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <EyeOff className="size-3" />
                      已隐藏
                    </span>
                  )}
                  <h3 className="font-medium">{item.title}</h3>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {item.content}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground/70">
                  {item.createdAt}
                  {item.createdByName ? ` · ${item.createdByName}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  title={item.isHidden ? "显示" : "隐藏"}
                  aria-label={item.isHidden ? "显示公告" : "隐藏公告"}
                  onClick={() => handleToggleHidden(item)}
                >
                  {item.isHidden ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title={item.isPinned ? "取消置顶" : "置顶"}
                  aria-label={item.isPinned ? "取消置顶" : "置顶公告"}
                  onClick={() => handleTogglePinned(item)}
                  className={
                    item.isPinned ? "text-amber-600" : "text-muted-foreground"
                  }
                >
                  {item.isPinned ? (
                    <Pin className="size-4" />
                  ) : (
                    <PinOff className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="编辑"
                  aria-label="编辑公告"
                  onClick={() => openEdit(item)}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="删除"
                  aria-label="删除公告"
                  className="text-destructive hover:text-destructive"
                  disabled={deleting === item.id}
                  onClick={() => handleDelete(item)}
                >
                  {deleting === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "编辑公告" : "新建公告"}</SheetTitle>
            <SheetDescription>
              填写标题与正文；可在发布后随时隐藏或置顶
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ann-title" className="text-sm font-medium">
                标题
              </label>
              <Input
                id="ann-title"
                value={draft.title}
                placeholder="公告标题（至少 2 个字）"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ann-content" className="text-sm font-medium">
                正文
              </label>
              <Textarea
                id="ann-content"
                value={draft.content}
                placeholder="公告正文（至少 5 个字）"
                rows={8}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, content: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={draft.isPinned ? "border-amber-500/50 text-amber-600" : ""}
                onClick={() =>
                  setDraft((d) => ({ ...d, isPinned: !d.isPinned }))
                }
              >
                {draft.isPinned ? <Pin /> : <PinOff />}
                {draft.isPinned ? "已置顶" : "置顶"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={draft.isHidden ? "border-destructive/50 text-destructive" : ""}
                onClick={() =>
                  setDraft((d) => ({ ...d, isHidden: !d.isHidden }))
                }
              >
                {draft.isHidden ? <EyeOff /> : <Eye />}
                {draft.isHidden ? "隐藏（不展示）" : "公开"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={busy}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
