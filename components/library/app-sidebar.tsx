"use client";

import {
  BookOpen,
  BookText,
  ChevronRight,
  Coffee,
  Library,
  MessageCircle,
  PartyPopper,
  Plane,
  Star,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { getCategoryStyle } from "@/lib/copywriting";

const categoryIcons: Record<string, LucideIcon> = {
  festival: PartyPopper,
  moments: MessageCircle,
  xiaohongshu: BookOpen,
  video: Video,
  daily: Coffee,
  poetry: BookText,
  travel: Plane,
};

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
  categories: SidebarCategory[];
  onSelect: (id: string) => void;
  isLoggedIn: boolean;
  userNickname: string;
}

export function AppSidebar({
  activeId,
  totalCount,
  favoriteCount,
  categories,
  onSelect,
  isLoggedIn,
  userNickname,
}: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();

  function handleSelect(id: string) {
    onSelect(id);
    setOpenMobile(false);
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
            <span className="text-sm leading-tight font-semibold">简心文案库</span>
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
                isActive={activeId === "all"}
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
            {categories.map((category) => {
              const Icon = categoryIcons[category.id] ?? Library;
              const style = getCategoryStyle(category.color);
              return (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    isActive={activeId === category.id}
                    onClick={() => handleSelect(category.id)}
                  >
                    <span
                      className="flex size-6 items-center justify-center rounded-md"
                      style={style.iconBg}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span>{category.label}</span>
                    <SidebarMenuBadge>{category.count}</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
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
