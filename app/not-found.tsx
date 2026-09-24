import Link from "next/link";
import { Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategories } from "@/lib/copywriting-data";
import { getCategoryStyle } from "@/lib/copywriting";

/** 品牌化 404：保持 404 状态码（App Router not-found.tsx 自动返回），
 *  提供搜索框 / 热门分类 / 返回首页，降低跳出率。 */
export default async function NotFound() {
  const categories = await getCategories();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 顶部品牌条 */}
      <header className="flex items-center justify-between border-b px-5 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          简心<span className="text-cyan-500">文案库</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          返回首页
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-5 py-16">
        {/* 大数字 */}
        <div className="text-center">
          <p className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-[96px] leading-none font-black tracking-tight text-transparent sm:text-[128px]">
            404
          </p>
          <h1 className="mt-3 text-lg font-semibold text-foreground">
            这页文案跑丢了
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            你要找的内容可能被移动、删除，或者从未存在。试试搜一下？
          </p>
        </div>

        {/* 搜索框：提交到首页 ?q=，直接命中站内搜索 */}
        <form action="/" method="get" className="flex w-full max-w-md gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="搜索文案，如：春节、励志…"
              className="h-11 pl-9"
            />
          </div>
          <Button type="submit" className="h-11 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500">
            搜索
          </Button>
        </form>

        {/* 热门分类 */}
        {categories.length > 0 && (
          <div className="w-full max-w-md">
            <p className="mb-2.5 text-xs font-medium text-muted-foreground">
              或者看看热门分类
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 8).map((category) => {
                const style = getCategoryStyle(category.color);
                return (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: style.dot.backgroundColor }}
                    />
                    {category.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 返回首页 */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button render={<Link href="/" />} variant="outline">
            <Home className="size-4" />
            返回首页
          </Button>
        </div>
      </main>

      <footer className="border-t px-5 py-4 text-center text-xs text-muted-foreground">
        简心文案库 · 让每一次表达都有灵感
      </footer>
    </div>
  );
}
