"use client";

import { useEffect, useState } from "react";

import type { MyCopyItem } from "@/lib/copywriting";

/** 收藏/投稿超过该数量时启用分页 */
export const LIST_PAGE_THRESHOLD = 50;
export const LIST_PAGE_SIZE = 20;

interface ListResponse {
  items: MyCopyItem[];
  total: number;
}

/**
 * 「我的收藏」「我的投稿」共用的列表逻辑：
 * 首次拉全量；总数超过 50 条自动切换为每页 20 条的分页模式；
 * 支持批量操作后重载。loading 用「期望 key vs 已完成 key」派生，
 * 避免在 effect 里同步 setState。
 */
export function useMyList(endpoint: string) {
  const [items, setItems] = useState<MyCopyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [paged, setPaged] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const expectedKey = paged
    ? `page:${page}:${reloadToken}`
    : `all:${reloadToken}`;
  const loading = loadedKey !== expectedKey;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  // 全量请求
  useEffect(() => {
    if (paged) return;
    let cancelled = false;
    fetch(endpoint)
      .then((res) => res.json())
      .then((data: ListResponse) => {
        if (cancelled) return;
        if (data.total > LIST_PAGE_THRESHOLD) {
          setPaged(true);
          setLoadedKey(`all:${reloadToken}`);
        } else {
          setItems(data.items);
          setTotal(data.total);
          setLoadedKey(`all:${reloadToken}`);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadedKey(`all:${reloadToken}`);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, paged, reloadToken]);

  // 分页请求
  useEffect(() => {
    if (!paged) return;
    let cancelled = false;
    fetch(`${endpoint}?page=${page}&pageSize=${LIST_PAGE_SIZE}`)
      .then((res) => res.json())
      .then((data: ListResponse) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setLoadedKey(`page:${page}:${reloadToken}`);
      })
      .catch(() => {
        if (!cancelled) setLoadedKey(`page:${page}:${reloadToken}`);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, paged, page, reloadToken]);

  /** 批量删除/取消收藏；整页删完且不在第一页时自动回退一页 */
  async function bulkRemove(ids: string[]) {
    if (ids.length === 0) return;
    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string };
      throw new Error(data?.error ?? "操作失败");
    }
    if (paged && items.length === ids.length && page > 1) {
      setPage((p) => p - 1);
    } else {
      setReloadToken((t) => t + 1);
    }
  }

  /** 局部重新拉取列表（回到第 1 页），不刷新整页 */
  function refresh() {
    setPage(1);
    setReloadToken((t) => t + 1);
  }

  return {
    items,
    total,
    loading,
    paged,
    page,
    totalPages,
    setPage,
    bulkRemove,
    refresh,
  };
}
