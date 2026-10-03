"use client";

import { useState } from "react";
import {
  ChevronRight,
  FolderTree,
  Home,
  Layers,
  Library,
  Star,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

interface SidebarCategory {
  id: string;
  label: string;
  count: number;
  color: string;
}

interface AppSidebarProps {
  activeId: string;
  totalCount: number;
  favoriteCount: number;
  /** 全部分类数量（/categories 入口徽标） */
  categoryTotal: number;
  /** 分类二级菜单数据（默认收缩，第一项「全部分类」固定） */
  categories: SidebarCategory[];
  onSelect: (id: string) => void;
  isLoggedIn: boolean;
  userNickname: string;
  siteName: string;
}

export function AppSidebar({
  activeId,
  totalCount,
  favoriteCount,
  categoryTotal,
  categories,
  onSelect,
  isLoggedIn,
  userNickname,
  siteName,
}: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  // 分类二级菜单默认展开；点击箭头收起
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  function handleSelect(id: string) {
    onSelect(id);
    setOpenMobile(false);
    // 走客户端路由（SPA，不刷新整页）；收藏是用户私有视图，不产生公开 URL
    if (id === "all") {
      // 列表视图已迁至 /home（/ 是探探风格交互首页）
      router.push("/home");
    } else if (id !== "favorites") {
      router.push(`/category/${id}`);
    }
  }

  function handleUserClick() {
    setOpenMobile(false);
    router.push(isLoggedIn ? "/user" : "/user/login");
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25">
            <Library className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm leading-tight font-semibold">{siteName}</span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
              Copy Console
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>资料库</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/home" />}
                isActive={pathname === "/home"}
              >
                <Home />
                <span>首页</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeId === "all" && pathname !== "/home"}
                onClick={() => handleSelect("all")}
              >
                <Library />
                <span>全部文案</span>
                <SidebarMenuBadge>{totalCount}</SidebarMenuBadge>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeId === "favorites"}
                onClick={() => handleSelect("favorites")}
              >
                <Star />
                <span>我的收藏</span>
                <SidebarMenuBadge>{favoriteCount}</SidebarMenuBadge>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>分类</SidebarGroupLabel>
          <SidebarMenu>
            {/* 第一项：全部分类总览页（整页链接，SEO 可抓取） */}
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/categories" />}
                isActive={activeId === "categories"}
              >
                <Layers />
                <span>全部分类</span>
                <SidebarMenuBadge>{categoryTotal}</SidebarMenuBadge>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* 第二项：文案分类二级菜单（默认收缩） */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setCategoriesOpen((v) => !v)}
                className={cn(categoriesOpen && "bg-sidebar-accent")}
                aria-expanded={categoriesOpen}
              >
                <FolderTree />
                <span>文案分类</span>
                <ChevronRight
                  className={cn(
                    "ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    categoriesOpen && "rotate-90"
                  )}
                />
              </SidebarMenuButton>
              {categoriesOpen && (
                <SidebarMenuSub>
                  {categories.map((category) => (
                    <SidebarMenuSubItem key={category.id}>
                      <SidebarMenuSubButton
                        render={<Link href={`/category/${category.id}`} />}
                        isActive={activeId === category.id}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.label}</span>
                        <SidebarMenuBadge>{category.count}</SidebarMenuBadge>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ThemeSwitcher />
        <button
          type="button"
          onClick={handleUserClick}
          className="flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-accent"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {isLoggedIn ? (userNickname.slice(0, 1) || "我") : "我"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {isLoggedIn ? userNickname : "未登录用户"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {isLoggedIn ? "个人中心" : "点击登录"}
            </span>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
