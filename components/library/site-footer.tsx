import { getSiteSettings } from "@/lib/site-settings";

/**
 * 全站页脚：简介 + 联系方式 + 版权。
 * 网站地图（sitemap.xml）只供爬虫抓取，不在页脚展示列表。
 */
export async function SiteFooter() {
  const settings = await getSiteSettings();

  const contactLines = settings.footer_contact
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {settings.site_name}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {settings.footer_about}
          </p>
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
