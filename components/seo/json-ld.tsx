/**
 * 可复用 JSON-LD 渲染组件（SEO 专用）
 *
 * XSS 防护：JSON.stringify 之后做 < > & 转义，杜绝任何输入以 </script>
 * 等方式闭合标签注入脚本。所有 SEO 页面统一用它输出 schema。
 *
 * 用法（服务端组件内）：
 *   <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: "…" }} />
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
