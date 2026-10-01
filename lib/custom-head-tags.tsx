import type { ReactNode } from "react";

/**
 * 把后台「站点设置 → 自定义元标签」的原始 HTML 行解析为合法 <head> 元素。
 *
 * 支持行格式（每行一条）：
 *   <meta name="..." content="...">            → React <meta>
 *   <link rel="..." href="...">                → React <link>
 *   <script src="..."></script> 或 <script src="..."/> → React <script>
 *   <script>任意 JS</script>                   → <script dangerouslySetInnerHTML>（内容原样）
 *   <style>任意 CSS</style>                    → <style dangerouslySetInnerHTML>（内容原样）
 *
 * 不匹配的行被忽略（后台有格式说明）。属性解析使用双引号形式，未加引号的属性不支持。
 */

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z:_-][a-zA-Z0-9:_-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
}

export function renderCustomHeadTags(raw: string): ReactNode[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const metaMatch = line.match(/^<meta\s+([^>]*?)\/?>\s*$/i);
      if (metaMatch) {
        return <meta key={i} {...parseAttrs(metaMatch[1])} />;
      }

      const linkMatch = line.match(/^<link\s+([^>]*?)\/?>\s*$/i);
      if (linkMatch) {
        return <link key={i} {...parseAttrs(linkMatch[1])} />;
      }

      const scriptPair = line.match(
        /^<script\s*([^>]*)>([\s\S]*?)<\/script>\s*$/i
      );
      if (scriptPair) {
        const attrs = parseAttrs(scriptPair[1]);
        const inner = scriptPair[2].trim();
        if (attrs.src) return <script key={i} {...attrs} />;
        return (
          <script
            key={i}
            {...attrs}
            // 内容为管理员后台配置的统计/验证脚本，由管理员自行负责
            dangerouslySetInnerHTML={{ __html: inner }}
          />
        );
      }

      const scriptSelf = line.match(/^<script\s*([^>]*?)\/>\s*$/i);
      if (scriptSelf) {
        return <script key={i} {...parseAttrs(scriptSelf[1])} />;
      }

      const stylePair = line.match(
        /^<style\s*([^>]*)>([\s\S]*?)<\/style>\s*$/i
      );
      if (stylePair) {
        return (
          <style
            key={i}
            {...parseAttrs(stylePair[1])}
            dangerouslySetInnerHTML={{ __html: stylePair[2].trim() }}
          />
        );
      }

      return null;
    })
    .filter(Boolean);
}
