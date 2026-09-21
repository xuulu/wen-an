import "server-only";

import { query } from "@/lib/db";

/** 归一化：转小写，去掉空白、标点与符号，让「排版差异」不影响比对 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

/** 字符 bigram 频次表（中英文都适用） */
function bigrams(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2);
    map.set(gram, (map.get(gram) ?? 0) + 1);
  }
  return map;
}

/**
 * 两段文本的相似度（Sørensen–Dice 系数，基于字符 bigram），范围 0-1。
 * 短文本基本被长文本完整包含时直接视为高度相似。
 */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na.length < 2 || nb.length < 2) return na === nb && na !== "" ? 1 : 0;
  if (na === nb) return 1;

  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (short.length >= 8 && long.includes(short) && short.length / long.length > 0.8) {
    return 1;
  }

  const ga = bigrams(na);
  const gb = bigrams(nb);
  let intersection = 0;
  for (const [gram, countA] of ga) {
    const countB = gb.get(gram);
    if (countB) intersection += Math.min(countA, countB);
  }
  return (2 * intersection) / (na.length - 1 + nb.length - 1);
}

export interface SimilarCopy {
  id: string;
  title: string;
  score: number;
}

/**
 * 与库中已有（未拒绝）文案比对正文，
 * 返回相似度达到 threshold 的最相似一条；没有则 null。
 * excludeId：排除指定文案（编辑自身内容时不与自己比对）。
 */
export async function findSimilarCopy(
  content: string,
  threshold = 0.8,
  excludeId?: string
): Promise<SimilarCopy | null> {
  const { rows } = await query<{
    id: number;
    title: string;
    content: string;
  }>("SELECT id, title, content FROM wenan_copy_items WHERE status <> 'rejected'");

  let best: SimilarCopy | null = null;
  for (const row of rows) {
    if (excludeId !== undefined && String(row.id) === excludeId) continue;
    const score = similarity(content, row.content);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: String(row.id), title: row.title, score };
    }
  }
  return best;
}

export interface DuplicateItem {
  id: string;
  title: string;
}

export interface DuplicateGroup {
  items: DuplicateItem[];
}

/**
 * 扫描所有未拒绝文案，把相似度 ≥ threshold 的聚成组（连通分量）。
 * 返回按组内数量降序的分组，每组至少 2 条。
 */
export async function findDuplicateGroups(
  threshold = 0.8
): Promise<DuplicateGroup[]> {
  const { rows } = await query<{
    id: number;
    title: string;
    content: string;
  }>("SELECT id, title, content FROM wenan_copy_items WHERE status <> 'rejected' ORDER BY id ASC");

  const n = rows.length;
  const parent = new Array(n).fill(0).map((_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (similarity(rows[i].content, rows[j].content) >= threshold) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, DuplicateItem[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const arr = groups.get(root) ?? [];
    arr.push({ id: String(rows[i].id), title: rows[i].title });
    groups.set(root, arr);
  }

  return [...groups.values()]
    .filter((g) => g.length >= 2)
    .map((items) => ({ items }))
    .sort((a, b) => b.items.length - a.items.length);
}
