import Link from "next/link";

import { getCategories } from "@/lib/copywriting-data";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * 全站页脚：简介 + 分类导航 + 联系方式 + 版权。
 * 分类链接使用真实路由（/category/[id]），方便用户与爬虫发现内页。
 */
export async function SiteFooter() {
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    getCategories(),
  ]);

  const contactLines = settings.footer_contact
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {settings.site_name}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {settings.footer_about}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">分类导航</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/category/${category.id}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/sitemap.xml"
            className="mt-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            站点地图
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">联系我们</h3>
          {contactLines.length > 0 ? (
            contactLines.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">暂无</p>
          )}
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>{settings.footer_copyright}</span>
          {settings.footer_icp && <span>{settings.footer_icp}</span>}
        </div>
      </div>
    </footer>
  );
}
