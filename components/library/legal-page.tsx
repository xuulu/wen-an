import Link from "next/link";

/** 法律 / 信息类页面共享章节结构 */
export interface LegalSection {
  heading: string;
  /** 段落（支持纯文本） */
  paras?: string[];
  /** 无序列表项 */
  list?: string[];
  /** 有序列表项（编号） */
  ordered?: string[];
  /** 自定义节点（如动态链接、联系方式） */
  custom?: React.ReactNode;
}

/**
 * 法律 / 信息页统一版式：标题 + 更新日期 + 章节。
 * 纯服务端渲染，样式手写（项目无 typography 插件）。
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
  related,
}: {
  title: string;
  updated?: string;
  intro?: string;
  sections: LegalSection[];
  related?: { href: string; label: string }[];
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <article className="rounded-2xl border bg-card p-6 sm:p-9">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {updated && (
          <p className="mt-2 text-xs text-muted-foreground">
            更新日期：{updated}
          </p>
        )}
        {intro && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-7">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-base font-semibold">
                {i + 1}. {section.heading}
              </h2>
              {section.paras?.map((p, j) => (
                <p
                  key={j}
                  className="mt-2 text-sm leading-7 text-muted-foreground"
                >
                  {p}
                </p>
              ))}
              {section.list && (
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-7 text-muted-foreground marker:text-muted-foreground/50">
                  {section.list.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
              {section.ordered && (
                <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-7 text-muted-foreground marker:text-muted-foreground/50">
                  {section.ordered.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ol>
              )}
              {section.custom && (
                <div className="mt-2 flex flex-col gap-1.5 text-sm leading-7 text-muted-foreground">
                  {section.custom}
                </div>
              )}
            </section>
          ))}
        </div>

        {related && related.length > 0 && (
          <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-sm">
            <span className="text-muted-foreground">相关页面：</span>
            {related.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="text-cyan-600 underline-offset-4 hover:underline dark:text-cyan-400"
              >
                {r.label}
              </Link>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
