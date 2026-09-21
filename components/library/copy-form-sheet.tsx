"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PenLine, X } from "lucide-react";

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
import {
  getCategoryStyle,
  type Category,
  type CopyItem,
} from "@/lib/copywriting";

interface CopyFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** 传入则为编辑模式 */
  initial?: CopyItem;
  /** 非编辑模式的提交地址（默认 /api/copy；用户投稿用 /api/user/copy） */
  actionUrl?: string;
  /** 编辑模式 PUT 请求地址前缀（默认 /api/copy，会拼上 /{id}） */
  editActionUrl?: string;
  /** 非编辑模式的标题与说明 */
  submitTitle?: string;
  submitDescription?: string;
  /** 编辑模式的说明 */
  editDescription?: string;
  /** 保存成功后的回调（组件内部已处理 router.refresh），回传新建/更新后的文案 */
  onSaved?: (item: CopyItem) => void;
  /** 为 true 时不触发 router.refresh，由父组件做局部刷新（如用户后台投稿） */
  skipRouterRefresh?: boolean;
}

export function CopyFormSheet({
  open,
  onOpenChange,
  categories,
  initial,
  actionUrl,
  editActionUrl,
  submitTitle,
  submitDescription,
  editDescription,
  onSaved,
  skipRouterRefresh,
}: CopyFormSheetProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? ""
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const editing = initial !== undefined;

  function addTag(raw: string) {
    const value = raw.trim().replace(/[,，]/g, "");
    if (!value) return;
    setTags((prev) =>
      prev.includes(value) || prev.length >= 10 ? prev : [...prev, value]
    );
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "，") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function reset() {
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setCategoryId(initial?.categoryId ?? categories[0]?.id ?? "");
    setTags(initial?.tags ?? []);
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) return;
    // 输入框里还留着没确认的标签，先收下
    const finalTags = tagInput.trim()
      ? tags.includes(tagInput.trim())
        ? tags
        : [...tags, tagInput.trim().replace(/[,，]/g, "")]
      : tags;

    setSubmitting(true);
    try {
      const res = await fetch(
        editing
          ? `${editActionUrl ?? "/api/copy"}/${initial.id}`
          : actionUrl ?? "/api/copy",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, categoryId, tags: finalTags }),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "保存失败");
      }

      const saved = (await res.json().catch(() => null)) as CopyItem | null;

      reset();
      onOpenChange(false);
      if (!skipRouterRefresh) router.refresh();
      if (saved) onSaved?.(saved);
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader className="px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 text-white">
                <PenLine className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <SheetTitle>
                  {editing ? "编辑文案" : submitTitle ?? "新建文案"}
                </SheetTitle>
                <SheetDescription>
                  {editing
                    ? editDescription ?? "修改后保存，立即更新。"
                    : submitDescription ??
                      "填写文案信息，提交后立即保存。"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="copy-title" className="text-sm font-medium">
                标题
              </label>
              <Input
                id="copy-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="一句话概括这条文案"
                maxLength={80}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">选择类目</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((category) => {
                  const style = getCategoryStyle(category.color);
                  const active = category.id === categoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <span className="size-2 shrink-0 rounded-full" style={style.dot} />
                      <span className="min-w-0 flex-1 truncate">
                        {category.label}
                      </span>
                      {active && <Check className="size-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="copy-content" className="text-sm font-medium">
                  正文
                </label>
                <span className="text-xs text-muted-foreground">
                  {content.length} 字
                </span>
              </div>
              <textarea
                id="copy-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="文案正文内容…"
                rows={7}
                required
                className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="copy-tags" className="text-sm font-medium">
                标签
              </label>
              <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`移除标签 ${tag}`}
                      onClick={() =>
                        setTags((prev) => prev.filter((t) => t !== tag))
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="copy-tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput.trim() && addTag(tagInput)}
                  placeholder={tags.length === 0 ? "回车添加，如：春节" : ""}
                  className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {editing ? "保存" : "提交"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
