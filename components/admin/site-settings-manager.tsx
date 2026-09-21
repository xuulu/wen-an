"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsMap = Record<string, string>;

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/** 原生多行输入（项目无 Textarea 组件） */
function TextareaField({
  rows = 2,
  value,
  onChange,
}: {
  rows?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

export function SiteSettingsManager() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedTip, setSavedTip] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings))
      .catch(() => setError("设置加载失败"));
  }, []);

  function set(key: string, value: string) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function uploadImage(field: string, file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("field", field);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (res.ok) set(field, data.path);
    else setError(data.error ?? "上传失败");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSettings(data.settings);
      setSavedTip(true);
      setTimeout(() => setSavedTip(false), 2000);
    } else {
      setError(data.error ?? "保存失败");
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        加载设置...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          修改后保存即实时生效，无需重启服务
        </p>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            保存设置
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {savedTip && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
          已保存并生效
        </p>
      )}

      <Section title="基本信息" desc="站点名称、域名与图标">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="网站名称">
            <Input
              value={settings.site_name}
              onChange={(e) => set("site_name", e.target.value)}
            />
          </Field>
          <Field label="标题后缀">
            <Input
              value={settings.site_title_suffix}
              onChange={(e) => set("site_title_suffix", e.target.value)}
            />
          </Field>
          <Field label="站点域名">
            <Input
              value={settings.site_url}
              onChange={(e) => set("site_url", e.target.value)}
            />
          </Field>
          <Field label="网站图标（favicon）">
            <div className="flex gap-2">
              <Input
                value={settings.site_icon}
                onChange={(e) => set("site_icon", e.target.value)}
              />
              <label className="shrink-0 cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadImage("site_icon", e.target.files?.[0])}
                />
                <span className="flex h-9 items-center gap-1 rounded-md border px-3 text-xs hover:bg-accent">
                  <Upload className="size-3.5" /> 上传
                </span>
              </label>
            </div>
          </Field>
          <Field label="Logo（留空则只显示名称）">
            <div className="flex gap-2">
              <Input
                value={settings.site_logo}
                onChange={(e) => set("site_logo", e.target.value)}
              />
              <label className="shrink-0 cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadImage("site_logo", e.target.files?.[0])}
                />
                <span className="flex h-9 items-center gap-1 rounded-md border px-3 text-xs hover:bg-accent">
                  <Upload className="size-3.5" /> 上传
                </span>
              </label>
            </div>
          </Field>
          <Field label="分享封面图（OG image）">
            <div className="flex gap-2">
              <Input
                value={settings.site_og_image}
                onChange={(e) => set("site_og_image", e.target.value)}
              />
              <label className="shrink-0 cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    uploadImage("site_og_image", e.target.files?.[0])
                  }
                />
                <span className="flex h-9 items-center gap-1 rounded-md border px-3 text-xs hover:bg-accent">
                  <Upload className="size-3.5" /> 上传
                </span>
              </label>
            </div>
          </Field>
        </div>
      </Section>

      <Section title="SEO 设置" desc="搜索引擎收录与搜索结果展示">
        <Field label="SEO 简介（建议 50-160 字）">
          <TextareaField
            rows={3}
            value={settings.seo_description}
            onChange={(v) => set("seo_description", v)}
          />
        </Field>
        <Field label="关键词（英文逗号分隔）">
          <TextareaField
            rows={2}
            value={settings.seo_keywords}
            onChange={(v) => set("seo_keywords", v)}
          />
        </Field>
      </Section>

      <Section title="页脚设置" desc="页脚展示的简介、联系方式与备案信息">
        <Field label="页脚简介">
          <TextareaField
            rows={2}
            value={settings.footer_about}
            onChange={(v) => set("footer_about", v)}
          />
        </Field>
        <Field label="联系方式（邮箱/QQ/微信等，可多行）">
          <TextareaField
            rows={2}
            value={settings.footer_contact}
            onChange={(v) => set("footer_contact", v)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="备案号（如 ICP 备案，支持链接文字）">
            <Input
              value={settings.footer_icp}
              onChange={(e) => set("footer_icp", e.target.value)}
            />
          </Field>
          <Field label="版权声明">
            <Input
              value={settings.footer_copyright}
              onChange={(e) => set("footer_copyright", e.target.value)}
            />
          </Field>
        </div>
      </Section>
    </form>
  );
}
