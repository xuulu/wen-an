"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { BatchImportSheet } from "@/components/library/batch-import-sheet";
import { CopyFormSheet } from "@/components/library/copy-form-sheet";
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
import type { DuplicateGroup } from "@/lib/similarity";
import {
  getCategoryStyle,
  statusLabels,
  statusStyles,
  type Category,
  type CopyItem,
  type CopyStatus,
} from "@/lib/copywriting";

const PAGE_SIZE = 50;

type StatusFilter = "all" | CopyStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "待审核" },
  { value: "all", label: "全部" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
];

/** 拒绝文案时的常用原因 */
const rejectReasons = [
  "内容与本站收录主题不符",
  "内容涉嫌违规或包含敏感信息",
  "含广告、引流推广或联系方式",
  "与已收录文案高度重复",
  "文案质量过低，存在错别字或语句不通",
  "涉嫌侵犯他人知识产权或其他权益",
];

/** 分页跳页输入 */
function AdminPageJump({
  totalPages,
  onJump,
}: {
  totalPages: number;
  onJump: (page: number) => void;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      跳到
      <input
        type="number"
        min={1}
        max={totalPages}
        aria-label="跳转页码"
        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const value = Number((e.target as HTMLInputElement).value);
            if (value >= 1 && value <= totalPages) onJump(value);
          }
        }}
      />
      页
    </span>
  );
}

export function CopyManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CopyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [pendingCount, setPendingCount] = useState(0);
  // 已完成加载的请求标识；与当前请求标识不一致时视为加载中（避免在 effect 里同步 setState）
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<CopyItem | undefined>(undefined);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  // 拒绝弹层
  const [rejectTarget, setRejectTarget] = useState<CopyItem | null>(null);
  const [rejectPreset, setRejectPreset] = useState(rejectReasons[0]);
  const [rejectCustom, setRejectCustom] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  // 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 重复检测
  const [dupOpen, setDupOpen] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[]>([]);
  const [dupSelected, setDupSelected] = useState<Set<string>>(new Set());

  const requestKey = `${page}:${reloadToken}:${statusFilter}:${search}`;
  const loading = loadedKey !== requestKey;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        status: statusFilter,
      });
      if (search.trim()) params.set("search", search.trim());

      fetch(`/api/copy?${params.toString()}`)
        .then((res) => res.json())
        .then((data: { items: CopyItem[]; total: number }) => {
          if (cancelled) return;
          setItems(data.items);
          setTotal(data.total);
          setLoadedKey(requestKey);
        })
        .catch(() => {
          if (!cancelled) setLoadedKey(requestKey);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, reloadToken, statusFilter, search, requestKey]);

  // 待审核数量徽标（只要重载就刷新）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/copy?status=pending&pageSize=1")
      .then((res) => res.json())
      .then((data: { total: number }) => {
        if (!cancelled) setPendingCount(data.total);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(item: CopyItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function openReject(item: CopyItem) {
    setRejectTarget(item);
    setRejectPreset(rejectReasons[0]);
    setRejectCustom("");
  }

  async function approveItem(item: CopyItem) {
    setReviewingId(item.id);
    try {
      const res = await fetch(`/api/copy/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "审核失败");
      refetch();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "审核失败，请重试");
    } finally {
      setReviewingId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const reason = rejectCustom.trim() || rejectPreset;
    setRejectSubmitting(true);
    try {
      const res = await fetch(`/api/copy/${rejectTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reason }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "拒绝失败");
      setRejectTarget(null);
      refetch();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "拒绝失败，请重试");
    } finally {
      setRejectSubmitting(false);
    }
  }

  async function handleDelete(item: CopyItem) {
    if (!confirm(`确定删除文案「${item.title}」吗？`)) return;

    try {
      const res = await fetch(`/api/copy/${item.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "删除失败");

      // 当前页只剩一条且不是第一页时，回退一页
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else refetch();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败，请重试");
    }
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const allOnPageSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        items.forEach((i) => next.delete(i.id));
      } else {
        items.forEach((i) => next.add(i.id));
      }
      return next;
    });
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条文案吗？`)) return;
    try {
      const res = await fetch("/api/copy/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "批量删除失败");
      setSelectedIds(new Set());
      // 当前页全删光且非第一页则回退一页
      if (items.length === selectedIds.size && page > 1) setPage((p) => p - 1);
      else refetch();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "批量删除失败，请重试");
    }
  }

  async function handleDetectDuplicates() {
    setDupOpen(true);
    setDupLoading(true);
    setDupGroups([]);
    setDupSelected(new Set());
    try {
      const res = await fetch("/api/copy/duplicates");
      const data = (await res.json().catch(() => null)) as
        | { groups?: DuplicateGroup[] }
        | { error?: string }
        | null;
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? "检测失败");
      const groups = (data as { groups?: DuplicateGroup[] } | null)?.groups ?? [];
      setDupGroups(groups);
      // 默认选中每组除第一条外的其余（保留一条）
      const sel = new Set<string>();
      groups.forEach((g) => g.items.slice(1).forEach((it) => sel.add(it.id)));
      setDupSelected(sel);
    } catch (err) {
      alert(err instanceof Error ? err.message : "重复检测失败，请重试");
    } finally {
      setDupLoading(false);
    }
  }

  function toggleDupSelect(id: string) {
    setDupSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelectedDuplicates() {
    if (dupSelected.size === 0) return;
    if (!confirm(`确定删除选中的 ${dupSelected.size} 条重复文案吗？`)) return;
    try {
      const res = await fetch("/api/copy/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...dupSelected] }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "删除失败");
      // 从结果中移除已删项
      setDupGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            items: g.items.filter((it) => !dupSelected.has(it.id)),
          }))
          .filter((g) => g.items.length >= 2)
      );
      setDupSelected(new Set());
      refetch();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败，请重试");
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">文案管理</h2>
          <p className="text-sm text-muted-foreground">
            共 {total} 条，可审核用户投稿、编辑所有文案
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetectDuplicates}
          >
            <ListChecks />
            检测重复
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBatchOpen(true)}
          >
            <Upload />
            批量导入
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus />
            新建文案
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span>
            已选 <span className="font-semibold">{selectedIds.size}</span> 条
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              取消选择
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBatchDelete}
            >
              <Trash2 />
              批量删除
            </Button>
          </div>
        </div>
      )}

      {pendingCount > 0 && statusFilter !== "pending" && (
        <button
          type="button"
          onClick={() => {
            setStatusFilter("pending");
            setPage(1);
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <BellRing className="size-4 shrink-0" />
          有 {pendingCount} 条用户投稿等待审核，点击查看
        </button>
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索标题、正文、类目或标签…"
            className="pl-8"
          />
        </div>
        <div className="flex w-full shrink-0 gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1 sm:w-auto">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none ${
                statusFilter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {f.value === "pending" && pendingCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">
                <input
                  type="checkbox"
                  className="size-4 cursor-pointer accent-primary"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  aria-label="全选本页"
                />
              </th>
              <th className="py-2 pr-4 font-medium">标题</th>
              <th className="py-2 pr-4 font-medium">类目</th>
              <th className="py-2 pr-4 font-medium">状态</th>
              <th className="py-2 pr-4 font-medium">标签</th>
              <th className="py-2 pr-4 font-medium">更新日期</th>
              <th className="py-2 pr-4 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  {statusFilter === "pending"
                    ? "暂无待审核的投稿"
                    : "没有符合条件的文案"}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const category = categoryMap.get(item.categoryId);
                const style = category
                  ? getCategoryStyle(category.color)
                  : null;
                return (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-primary"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`选择 ${item.title}`}
                      />
                    </td>
                    <td className="max-w-52 truncate py-2 pr-4 font-medium">
                      {item.title}
                    </td>
                    <td className="py-2 pr-4">
                      {style && category ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                          style={style.badge}
                        >
                          {category.label}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </td>
                    <td className="max-w-40 truncate py-2 pr-4 text-muted-foreground">
                      {item.tags.map((t) => `#${t}`).join(" ") || "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {item.updatedAt}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex justify-end gap-1">
                        {item.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="通过"
                              disabled={reviewingId === item.id}
                              onClick={() => approveItem(item)}
                            >
                              <Check className="text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="拒绝"
                              disabled={reviewingId === item.id}
                              onClick={() => openReject(item)}
                            >
                              <Ban className="text-amber-600" />
                            </Button>
                          </>
                        )}
                        {item.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="拒绝已通过文案"
                            disabled={reviewingId === item.id}
                            onClick={() => openReject(item)}
                          >
                            <Ban className="text-amber-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="编辑文案"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="删除文案"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft />
          上一页
        </Button>
        <span className="text-sm text-muted-foreground">
          第 {page} / {totalPages} 页
        </span>
        <AdminPageJump totalPages={totalPages} onJump={setPage} />
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
          <ChevronRight />
        </Button>
      </div>

      <Sheet
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open && !rejectSubmitting) setRejectTarget(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirmReject();
            }}
            className="flex h-full flex-col"
          >
            <SheetHeader className="px-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Ban className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <SheetTitle>拒绝文案</SheetTitle>
                  <SheetDescription className="truncate">
                    {rejectTarget?.title}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="reject-preset" className="text-sm font-medium">
                  常用原因
                </label>
                <select
                  id="reject-preset"
                  value={rejectPreset}
                  onChange={(e) => setRejectPreset(e.target.value)}
                  disabled={rejectCustom.trim().length > 0}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  {rejectReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="reject-custom" className="text-sm font-medium">
                  自定义回复（选填，填写后优先使用）
                </label>
                <textarea
                  id="reject-custom"
                  value={rejectCustom}
                  onChange={(e) => setRejectCustom(e.target.value)}
                  placeholder="留空则使用上方常用原因；如需特殊说明可在此填写…"
                  rows={5}
                  className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  最终原因：{rejectCustom.trim() || rejectPreset}
                </p>
              </div>
            </div>

            <SheetFooter className="px-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectTarget(null)}
                disabled={rejectSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={rejectSubmitting}>
                {rejectSubmitting && <Loader2 className="animate-spin" />}
                确认拒绝
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <CopyFormSheet
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        initial={editing}
        onSaved={refetch}
      />
      <BatchImportSheet
        open={batchOpen}
        onOpenChange={setBatchOpen}
        categories={categories}
        actionUrl="/api/copy/batch"
        mode="admin"
        onSaved={refetch}
      />

      <Sheet open={dupOpen} onOpenChange={setDupOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader className="px-5">
            <SheetTitle>重复文案检测</SheetTitle>
            <SheetDescription>
              相似度 ≥ 80% 的文案归为一组，默认保留每组第一条，其余可批量删除。
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {dupLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                正在扫描全部文案…
              </div>
            ) : dupGroups.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                未发现重复文案
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {dupGroups.map((g, gi) => (
                  <li
                    key={gi}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      第 {gi + 1} 组 · {g.items.length} 条相似
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {g.items.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-primary"
                            checked={dupSelected.has(it.id)}
                            onChange={() => toggleDupSelect(it.id)}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {it.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {dupGroups.length > 0 && (
            <div className="border-t px-5 py-3">
              <Button
                className="w-full"
                variant="destructive"
                disabled={dupSelected.size === 0}
                onClick={handleDeleteSelectedDuplicates}
              >
                <Trash2 />
                删除选中的 {dupSelected.size} 条
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
