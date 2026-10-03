"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, Tags } from "lucide-react";

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
  CATEGORY_PRESET_COLORS,
  DEFAULT_CATEGORY_COLOR,
  getCategoryStyle,
  isValidHexColor,
  type Category,
} from "@/lib/copywriting";

interface FormState {
  id: string | null;
  label: string;
  color: string;
  sortOrder: number;
  description: string;
}

const emptyForm: FormState = {
  id: null,
  label: "",
  color: DEFAULT_CATEGORY_COLOR,
  sortOrder: 0,
  description: "",
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const editing = form.id !== null;

  function openAdd() {
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(category: Category) {
    setForm({
      id: category.id,
      label: category.label,
      color: category.color,
      sortOrder: category.sortOrder ?? 0,
      description: category.description ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.label.trim()) return;
    if (!isValidHexColor(form.color)) {
      alert("配色必须是 #RRGGBB 六位十六进制颜色码");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/categories/${form.id}` : "/api/categories",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: form.label.trim(),
            color: form.color,
            sortOrder: form.sortOrder,
            description: form.description.trim(),
          }),
        }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "保存失败");

      setOpen(false);
      setForm(emptyForm);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(`确定删除类目「${category.label}」吗？`)) return;

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "删除失败");

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败，请重试");
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">类目管理</h2>
          <p className="text-sm text-muted-foreground">
            类目下还有文案时无法删除；可从预设色板选色或填写自定义颜色码
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus />
          新增类目
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">名称</th>
              <th className="py-2 pr-4 font-medium">配色</th>
              <th className="py-2 pr-4 font-medium">排序</th>
              <th className="py-2 pr-4 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const style = getCategoryStyle(category.color);
              return (
                <tr key={category.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{category.label}</td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-3 rounded-full"
                        style={style.dot}
                      />
                      <span className="font-mono text-xs">
                        {category.color}
                      </span>
                    </span>
                  </td>
                  <td className="py-2 pr-4">{category.sortOrder ?? 0}</td>
                  <td className="py-2 pr-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="编辑类目"
                        onClick={() => openEdit(category)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除类目"
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 新增 / 编辑统一走侧边栏弹层 */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex h-full flex-col"
          >
            <SheetHeader className="px-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                  <Tags className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <SheetTitle>{editing ? "编辑类目" : "新增类目"}</SheetTitle>
                  <SheetDescription>
                    {editing
                      ? `修改「${form.label}」的名称、简介、排序或配色，保存后全站即时生效。`
                      : "填写类目信息，保存后前台分类导航与分类页即时生效。"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="category-label" className="text-sm font-medium">
                    类目名称
                  </label>
                  <Input
                    id="category-label"
                    value={form.label}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, label: e.target.value }))
                    }
                    placeholder="例如：朋友圈文案"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="category-sort" className="text-sm font-medium">
                    排序
                  </label>
                  <Input
                    id="category-sort"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-24"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="category-description"
                  className="text-sm font-medium"
                >
                  类目简介（分类页展示，SEO 收录，可留空用默认简介）
                </label>
                <textarea
                  id="category-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="例如：适合朋友圈发布的生活感悟、心情短句，配图即可用"
                  className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">类目配色</span>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
                  {CATEGORY_PRESET_COLORS.map((color) => {
                    const active = form.color === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        aria-label={`选择配色 ${color}`}
                        onClick={() => setForm((f) => ({ ...f, color }))}
                        className={`aspect-square rounded-md border transition-shadow ${
                          active
                            ? "ring-2 ring-ring ring-offset-1 ring-offset-card"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-md border">
                    <input
                      type="color"
                      aria-label="自定义取色器"
                      value={
                        isValidHexColor(form.color)
                          ? form.color
                          : DEFAULT_CATEGORY_COLOR
                      }
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                    <span
                      className="size-5 rounded-full border"
                      style={{ backgroundColor: form.color }}
                    />
                  </label>
                  <Input
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    placeholder="#6366F1"
                    maxLength={7}
                    className="w-32 font-mono"
                  />
                  {!isValidHexColor(form.color) && (
                    <span className="text-xs text-rose-600">
                      请输入 #RRGGBB 六位颜色码
                    </span>
                  )}
                </div>
              </div>
            </div>

            <SheetFooter className="px-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={
                  saving || !form.label.trim() || !isValidHexColor(form.color)
                }
              >
                {saving ? <Loader2 className="animate-spin" /> : <Plus />}
                {editing ? "保存" : "添加"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
