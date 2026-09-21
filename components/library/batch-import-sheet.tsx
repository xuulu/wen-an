"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
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
} from "@/lib/copywriting";
import { parseBatchInput } from "@/lib/batch-import";

interface BatchImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** 提交地址：管理员 /api/copy/batch，用户 /api/user/copy/batch */
  actionUrl: string;
  /** admin：直接入库；user：走待审核 + 相似度跳过 */
  mode: "admin" | "user";
  onSaved?: () => void;
}

interface BatchResult {
  inserted: number;
  skipped?: {
    index: number;
    title: string;
    score: number;
    similarTitle: string;
  }[];
  errors: { index: number; error: string }[];
}

const TXT_SAMPLE = `春节祝福|辞旧迎新岁，万事皆可期。祝你新春快乐！|春节,祝福|2026-02-10
周末随笔|慢下来的日子，每一秒都在发光。
时间戳示例|这条文案用 Unix 时间戳作为创建时间。|测试|1739145600`;

const JSON_SAMPLE = `[
  { "title": "春节祝福", "content": "辞旧迎新岁，万事皆可期。祝你新春快乐！", "tags": ["春节","祝福"], "createdAt": "2026-02-10" },
  { "title": "周末随笔", "content": "慢下来的日子，每一秒都在发光。" }
]`;

export function BatchImportSheet({
  open,
  onOpenChange,
  categories,
  actionUrl,
  mode,
  onSaved,
}: BatchImportSheetProps) {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [categoryId, setCategoryId] = useState(
    categories[0]?.id ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const parsed = useMemo(() => parseBatchInput(rawText), [rawText]);
  const canSubmit =
    parsed.items.length > 0 &&
    categoryId.length > 0 &&
    !submitting;

  function reset() {
    setRawText("");
    setResult(null);
    setCategoryId(categories[0]?.id ?? "");
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setRawText(typeof reader.result === "string" ? reader.result : "");
      setResult(null);
    };
    reader.onerror = () => alert("文件读取失败");
    reader.readAsText(file, "utf-8");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, items: parsed.items }),
      });
      const data = (await res.json().catch(() => null)) as
        | BatchResult
        | { error?: string }
        | null;
      if (!res.ok) {
        const err = data as { error?: string } | null;
        throw new Error(err?.error ?? "提交失败");
      }
      setResult(data as BatchResult);
      setRawText("");
      router.refresh();
      onSaved?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    // 关闭动画结束后清理
    window.setTimeout(reset, 300);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader className="px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 text-white">
                <Upload className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <SheetTitle>
                  {mode === "admin" ? "批量导入文案" : "批量投稿文案"}
                </SheetTitle>
                <SheetDescription>
                  {mode === "admin"
                    ? "支持 txt / json，直接入库。"
                    : "支持 txt / json，进入待审核，相似度过高自动跳过。"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            {/* 类目选择 */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                统一类目（所有条目共用）
              </span>
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
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={style.dot}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {category.label}
                      </span>
                      {active && (
                        <Check className="size-3.5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 文件上传 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">上传文件</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <FileUp className="size-4" />
                点击选择 .txt 或 .json 文件
                <input
                  type="file"
                  accept=".txt,.json,application/json,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* 文本框 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="batch-raw" className="text-sm font-medium">
                  或粘贴内容
                </label>
                {rawText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawText("");
                      setResult(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    清空
                  </button>
                )}
              </div>
              <textarea
                id="batch-raw"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setResult(null);
                }}
                placeholder={TXT_SAMPLE}
                rows={6}
                className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* 解析预览 */}
            {rawText.trim().length > 0 && (
              <ParsedPreview parsed={parsed} />
            )}

            {/* 提交结果 */}
            {result && <ResultView result={result} mode={mode} />}

            {/* 格式规则 */}
            <details className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                格式规则与示例
              </summary>
              <div className="mt-2 flex flex-col gap-3">
                <div>
                  <p className="font-medium text-foreground">txt 格式</p>
                  <p className="mt-1">
                    每行一条，字段以 <code>|</code> 分隔，顺序：
                    <code>标题|正文|标签(可选)|创建时间(可选)</code>
                  </p>
                  <p className="mt-1">
                    标签用英文/中文逗号分隔多个；创建时间支持
                    YYYY-MM-DD（月日可省略前导零）或 Unix 时间戳（10 位秒 /
                    13 位毫秒）。
                  </p>
                  <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-[11px] leading-relaxed">
{TXT_SAMPLE}
                  </pre>
                </div>
                <div>
                  <p className="font-medium text-foreground">JSON 格式</p>
                  <p className="mt-1">
                    数组形式，每项含 <code>title</code>、<code>content</code>，
                    可选 <code>tags</code>、<code>createdAt</code>。
                  </p>
                  <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-[11px] leading-relaxed">
{JSON_SAMPLE}
                  </pre>
                </div>
                <p>
                  {mode === "admin"
                    ? "管理员导入无条数限制；"
                    : "用户单次最多 500 条；"}
                  标题 1-80 字；正文 5-5000 字；标签每个最多 20 字、最多 10 个。
                </p>
              </div>
            </details>
          </div>

          <SheetFooter className="px-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              关闭
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "admin" ? "导入" : "投稿"}
              {parsed.items.length > 0
                ? `（${parsed.items.length} 条）`
                : ""}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ParsedPreview({
  parsed,
}: {
  parsed: ReturnType<typeof parseBatchInput>;
}) {
  if (parsed.errors.length > 0) {
    return (
      <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <p className="font-medium">解析失败，整批无法提交：</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {parsed.errors.map((err, i) => (
            <li key={i}>• {err}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (parsed.items.length === 0) return null;
  const preview = parsed.items.slice(0, 5);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          即将导入 {parsed.items.length} 条
        </span>
      </div>
      <ul className="flex flex-col gap-1 rounded-md border bg-muted/30 p-2 text-xs">
        {preview.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0 flex-1 truncate font-medium">
              {item.title}
            </span>
            {item.tags.length > 0 && (
              <span className="shrink-0 text-muted-foreground">
                {item.tags.join("/")}
              </span>
            )}
            {item.createdAt && (
              <span className="shrink-0 text-muted-foreground">
                {item.createdAt}
              </span>
            )}
          </li>
        ))}
        {parsed.items.length > 5 && (
          <li className="text-muted-foreground">
            …还有 {parsed.items.length - 5} 条
          </li>
        )}
      </ul>
    </div>
  );
}

function ResultView({
  result,
  mode,
}: {
  result: BatchResult;
  mode: "admin" | "user";
}) {
  const skipped = result.skipped ?? [];
  const hasIssue = skipped.length > 0 || result.errors.length > 0;
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
      <p className="font-medium text-foreground">
        成功 {result.inserted} 条
        {mode === "user" && skipped.length > 0 && (
          <>，跳过 {skipped.length} 条（相似度过高）</>
        )}
        {result.errors.length > 0 && (
          <>，失败 {result.errors.length} 条</>
        )}
      </p>
      {skipped.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-amber-700 dark:text-amber-300">
          {skipped.map((s, i) => (
            <li key={i}>
              • 「{s.title}」与已有「{s.similarTitle}」相似度{" "}
              {Math.round(s.score * 100)}%
            </li>
          ))}
        </ul>
      )}
      {result.errors.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-rose-700 dark:text-rose-300">
          {result.errors.map((e, i) => (
            <li key={i}>
              • 第 {e.index + 1} 条：{e.error}
            </li>
          ))}
        </ul>
      )}
      {!hasIssue && (
        <p className="text-emerald-700 dark:text-emerald-300">
          全部导入完成。
        </p>
      )}
    </div>
  );
}
