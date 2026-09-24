import "server-only";
import { query } from "@/lib/db";
import { normalizeDate, type ParsedCopyInput } from "@/lib/batch-import";
import {
  type Category,
  type CopyItem,
  type CopyStatus,
  type MyCopyItem,
  normalizeCategoryColor,
} from "@/lib/copywriting";

interface CategoryRow {
  id: number;
  label: string;
  color: string;
  sort_order: number;
}

interface CopyItemRow {
  id: number;
  title: string;
  content: string;
  category_id: number;
  status: CopyStatus;
  updated_at: Date | string;
  is_favorite: boolean;
  review_reason?: string;
  /** 投稿人 id（NULL = 公共预置文案） */
  user_id?: number | null;
  /** 投稿人昵称（JOIN wenan_users） */
  author_name?: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface CopyItemsOptions {
  /** "all" 全部 / "favorites" 收藏 / 类目 id */
  categoryId?: string;
  /** 收藏归属的用户 id；0 表示未登录（无收藏状态） */
  userId?: number;
  pagination?: Pagination;
  /** 模糊搜索：标题、正文、类目名 */
  search?: string;
  /** "all" 不过滤（管理员）；默认只看 approved */
  status?: "all" | CopyStatus;
  /** 只看某个用户创建的文案（用户后台「我的投稿」） */
  createdBy?: number;
  /** 排序：updated（默认，时间倒序）/ random（按 randomSeed 确定性随机，翻页稳定） */
  sort?: "updated" | "random";
  /** sort="random" 时的随机种子（整数）；同种子排序稳定，换种子重新随机 */
  randomSeed?: number;
}

function formatDate(value: Date | string, kind: "date" | "datetime" = "date"): string {
  if (value instanceof Date) {
    // pg 把 date 列按本地时区午夜解析，必须用本地分量，toISOString 会按 UTC 少一天
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    if (kind === "datetime") {
      const hh = String(value.getHours()).padStart(2, "0");
      const mm = String(value.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${d} ${hh}:${mm}`;
    }
    return `${y}-${m}-${d}`;
  }
  return kind === "datetime"
    ? String(value).slice(0, 16).replace("T", " ")
    : String(value).slice(0, 10);
}

/** 获取所有类目（数量小，不分页） */
export async function getCategories(): Promise<Category[]> {
  const { rows } = await query<CategoryRow>(
    "SELECT id, label, color, sort_order FROM wenan_categories ORDER BY sort_order ASC, id ASC"
  );
  return rows.map((row) => ({
    id: String(row.id),
    label: row.label,
    color: normalizeCategoryColor(row.color),
    sortOrder: row.sort_order,
  }));
}

/** 新建类目 */
export async function createCategory(data: {
  label: string;
  color: string;
  sortOrder: number;
}): Promise<Category> {
  const { rows } = await query<CategoryRow>(
    `INSERT INTO wenan_categories (label, color, sort_order)
     VALUES ($1, $2, $3)
     RETURNING id, label, color, sort_order`,
    [data.label, normalizeCategoryColor(data.color), data.sortOrder]
  );
  const row = rows[0];
  if (!row) throw new Error("创建类目未返回数据");
  return {
    id: String(row.id),
    label: row.label,
    color: normalizeCategoryColor(row.color),
    sortOrder: row.sort_order,
  };
}

/** 更新类目 */
export async function updateCategory(
  id: string,
  data: { label: string; color: string; sortOrder: number }
): Promise<Category | null> {
  const { rows, rowCount } = await query<CategoryRow>(
    `UPDATE wenan_categories
     SET label = $1, color = $2, sort_order = $3
     WHERE id = $4
     RETURNING id, label, color, sort_order`,
    [data.label, normalizeCategoryColor(data.color), data.sortOrder, Number(id)]
  );
  if ((rowCount ?? 0) === 0) return null;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    label: row.label,
    color: normalizeCategoryColor(row.color),
    sortOrder: row.sort_order,
  };
}

/**
 * 删除类目。外键是 ON DELETE CASCADE，会连带删除类目下所有文案，
 * 因此类目下还有文案时拒绝删除。
 */
export async function deleteCategory(
  id: string
): Promise<{ ok: boolean; itemCount: number }> {
  const { rows } = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM wenan_copy_items WHERE category_id = $1",
    [Number(id)]
  );
  const itemCount = rows[0]?.count ?? 0;
  if (itemCount > 0) return { ok: false, itemCount };

  const { rowCount } = await query(
    "DELETE FROM wenan_categories WHERE id = $1",
    [Number(id)]
  );
  return { ok: (rowCount ?? 0) > 0, itemCount: 0 };
}

/**
 * 获取文案列表（带分页、模糊搜索、状态过滤与总数）
 * 模糊搜索范围：标题、正文、类目名
 */
export async function getCopyItems(
  options: CopyItemsOptions = {}
): Promise<Paged<CopyItem>> {
  const {
    categoryId,
    userId = 0,
    pagination,
    search,
    status = "approved",
    createdBy,
    sort = "updated",
    randomSeed,
  } = options;

  const onlyFavorites = categoryId === "favorites";
  const filterByCategory =
    categoryId !== undefined &&
    categoryId !== "all" &&
    categoryId !== "favorites";
  const keyword = search?.trim();

  // SELECT：$1 = userId（is_favorite 子查询），条件参数从 $2 起
  const selectConds: string[] = ["c.deleted_at IS NULL"];
  const selectParams: unknown[] = [userId];

  if (filterByCategory) {
    selectParams.push(Number(categoryId));
    selectConds.push(`c.category_id = $${selectParams.length}`);
  }

  if (onlyFavorites) {
    selectParams.push(userId);
    selectConds.push(`
      EXISTS (
        SELECT 1 FROM wenan_user_favorites f
        WHERE f.copy_id = c.id AND f.user_id = $${selectParams.length}
      )
    `);
  }

  if (createdBy !== undefined) {
    selectParams.push(createdBy);
    selectConds.push(`c.user_id = $${selectParams.length}`);
  }

  if (status !== "all") {
    selectParams.push(status);
    selectConds.push(`c.status = $${selectParams.length}`);
  }

  if (keyword) {
    selectParams.push(`%${keyword}%`);
    const p = `$${selectParams.length}`;
    selectConds.push(`
      (
        c.title ILIKE ${p}
        OR c.content ILIKE ${p}
        OR cat.label ILIKE ${p}
      )
    `);
  }

  // COUNT：条件参数从 $1 起（占位符序列与 SELECT 不同，参数分开构建）
  const countConds: string[] = ["c.deleted_at IS NULL"];
  const countParams: unknown[] = [];

  if (filterByCategory) {
    countParams.push(Number(categoryId));
    countConds.push(`c.category_id = $${countParams.length}`);
  }
  if (onlyFavorites) {
    countParams.push(userId);
    countConds.push(`
      EXISTS (
        SELECT 1 FROM wenan_user_favorites f
        WHERE f.copy_id = c.id AND f.user_id = $${countParams.length}
      )
    `);
  }
  if (createdBy !== undefined) {
    countParams.push(createdBy);
    countConds.push(`c.user_id = $${countParams.length}`);
  }
  if (status !== "all") {
    countParams.push(status);
    countConds.push(`c.status = $${countParams.length}`);
  }
  if (keyword) {
    countParams.push(`%${keyword}%`);
    const p = `$${countParams.length}`;
    countConds.push(`
      (
        c.title ILIKE ${p}
        OR c.content ILIKE ${p}
        OR cat.label ILIKE ${p}
      )
    `);
  }

  const selectWhere =
    selectConds.length > 0 ? `WHERE ${selectConds.join(" AND ")}` : "";
  const countWhere =
    countConds.length > 0 ? `WHERE ${countConds.join(" AND ")}` : "";

  const countSql = `SELECT COUNT(*)::int AS total
    FROM wenan_copy_items c
    JOIN wenan_categories cat ON cat.id = c.category_id
    ${countWhere}`;
  const { rows: countRows } = await query<{ total: number }>(
    countSql,
    countParams
  );
  const total = countRows[0]?.total ?? 0;

  // LIMIT/OFFSET 只拼接已校验的整数
  let limitSql = "";
  if (pagination) {
    const limit = Math.max(1, Math.floor(pagination.pageSize));
    const offset = (Math.max(1, Math.floor(pagination.page)) - 1) * limit;
    limitSql = ` LIMIT ${limit} OFFSET ${offset}`;
  }

  // 排序：random 用 md5(id+seed) 做确定性随机（同种子翻页稳定、换种子重新随机），
  // 由数据库完成随机排序，客户端不再全量洗牌，支持服务端分页
  let orderSql = "ORDER BY c.updated_at DESC, c.id DESC";
  let orderParams: unknown[] = [];
  if (sort === "random" && randomSeed !== undefined) {
    orderParams = [String(Math.floor(randomSeed))];
    orderSql = `ORDER BY md5(c.id::text || $${selectParams.length + 1}), c.id`;
  }

  const sql = `
    SELECT
      c.id,
      c.title,
      c.content,
      c.category_id,
      c.status,
      c.updated_at,
      c.review_reason,
      EXISTS (
        SELECT 1 FROM wenan_user_favorites f
        WHERE f.copy_id = c.id AND f.user_id = $1
      ) AS is_favorite
    FROM wenan_copy_items c
    JOIN wenan_categories cat ON cat.id = c.category_id
    ${selectWhere}
    ${orderSql}
    ${limitSql}
  `;

  const { rows } = await query<CopyItemRow>(sql, [
    ...selectParams,
    ...orderParams,
  ]);

  return {
    items: rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      content: row.content,
      categoryId: String(row.category_id),
      favorite: row.is_favorite,
      status: row.status,
      updatedAt: formatDate(row.updated_at),
      reviewReason: row.review_reason,
    })),
    total,
  };
}

/** 各分类已上架文案数量（侧栏分类徽标，轻量聚合，避免全量拉取） */
export async function getCategoryCounts(): Promise<{ id: string; count: number }[]> {
  const { rows } = await query<{ id: number; count: number }>(
    `SELECT cat.id, COUNT(c.id)::int AS count
     FROM wenan_categories cat
     LEFT JOIN wenan_copy_items c ON c.category_id = cat.id AND c.status = 'approved' AND c.deleted_at IS NULL
     GROUP BY cat.id
     ORDER BY cat.sort_order ASC, cat.id ASC`
  );
  return rows.map((row) => ({ id: String(row.id), count: row.count }));
}

/** 当前用户已上架收藏数（侧栏收藏徽标） */
export async function getFavoritesCount(userId: number): Promise<number> {
  if (userId <= 0) return 0;
  const { rows } = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM wenan_user_favorites f
     JOIN wenan_copy_items c ON c.id = f.copy_id
     WHERE f.user_id = $1 AND c.status = 'approved' AND c.deleted_at IS NULL`,
    [userId]
  );
  return rows[0]?.total ?? 0;
}

/** 按文案 id 查询单条；includeDeleted=true 时连软删记录一起返回（回收站用） */
export async function getCopyItemById(
  id: string,
  userId = 0,
  includeDeleted = false
): Promise<CopyItem | null> {
  const { rows } = await query<CopyItemRow>(
    `
      SELECT
        c.id, c.title, c.content, c.category_id, c.status, c.updated_at,
        c.review_reason, c.user_id, u.nickname AS author_name,
        EXISTS (
          SELECT 1 FROM wenan_user_favorites f
          WHERE f.copy_id = c.id AND f.user_id = $1
        ) AS is_favorite
      FROM wenan_copy_items c
      LEFT JOIN wenan_users u ON u.id = c.user_id
      WHERE c.id = $2 ${includeDeleted ? "" : "AND c.deleted_at IS NULL"}
    `,
    [userId, Number(id)]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    categoryId: String(row.category_id),
    favorite: row.is_favorite,
    status: row.status,
    updatedAt: formatDate(row.updated_at),
    reviewReason: row.review_reason,
    // 投稿人信息：仅用户投稿（user_id 非空）时返回，公共预置文案忽略
    ...(row.user_id
      ? {
          authorId: String(row.user_id),
          authorName: row.author_name ?? `用户${row.user_id}`,
        }
      : {}),
  };
}

/**
 * 新建文案。
 * 管理员创建：user_id 为 NULL（公共文案）、status = approved；
 * 用户投稿：user_id 为本人、status = pending（待审核）。
 * createdAt：可选，YYYY-MM-DD 字符串，写入 updated_at；未提供则用当日。
 */
export async function createCopyItem(
  data: {
    title: string;
    content: string;
    categoryId: string;
  },
  opts: {
    userId?: number | null;
    status?: CopyStatus;
    createdAtRaw?: string;
  } = {}
): Promise<CopyItem> {
  const { userId = null, status = "approved", createdAtRaw } = opts;
  const createdAt = createdAtRaw ? normalizeDate(createdAtRaw) : null;
  const { rows } = await query<{ id: number }>(
    `INSERT INTO wenan_copy_items
       (title, content, category_id, user_id, status, updated_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
     RETURNING id`,
    [
      data.title,
      data.content,
      Number(data.categoryId),
      userId,
      status,
      createdAt ?? null,
    ]
  );
  const newId = rows[0]?.id;
  if (!newId) throw new Error("新建文案未返回 id");
  const item = await getCopyItemById(String(newId), userId ?? 0);
  if (!item) throw new Error("新建文案后查询失败");
  return item;
}

/** 审核文案：更新状态与原因（仅管理员）；未传 reason 时清空原因 */
export async function setCopyItemStatus(
  id: string,
  status: CopyStatus,
  reason = ""
): Promise<CopyItem | null> {
  const { rowCount } = await query(
    "UPDATE wenan_copy_items SET status = $1, review_reason = $3 WHERE id = $2",
    [status, Number(id), reason]
  );
  if ((rowCount ?? 0) === 0) return null;
  return getCopyItemById(id);
}

/** 取所有待审核文案（一键审核/定时审核用） */
export async function getPendingCopyItems(): Promise<CopyItem[]> {
  const { rows } = await query<CopyItemRow>(
    `SELECT id, title, content, category_id, status, updated_at,
            FALSE AS is_favorite
     FROM wenan_copy_items
     WHERE status = 'pending' AND deleted_at IS NULL
     ORDER BY created_at ASC, id ASC`
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    content: row.content,
    categoryId: String(row.category_id),
    favorite: false,
    status: row.status,
    updatedAt: formatDate(row.updated_at),
  }));
}

/** 批量更新文案审核状态，返回更新条数 */
export async function setCopyItemsStatusBatch(
  ids: string[],
  status: CopyStatus
): Promise<number> {
  if (ids.length === 0) return 0;
  const nums = ids.map(Number).filter(Number.isFinite);
  if (nums.length === 0) return 0;
  const { rowCount } = await query(
    "UPDATE wenan_copy_items SET status = $1 WHERE id = ANY($2::bigint[])",
    [status, nums]
  );
  return rowCount ?? 0;
}

/** 更新文案（仅管理员可调用，可修改所有文案） */
export async function updateCopyItem(
  id: string,
  data: {
    title: string;
    content: string;
    categoryId: string;
  }
): Promise<CopyItem | null> {
  const { rowCount } = await query(
    `UPDATE wenan_copy_items
     SET title = $1, content = $2, category_id = $3, updated_at = CURRENT_DATE
     WHERE id = $4`,
    [data.title, data.content, Number(data.categoryId), Number(id)]
  );
  if ((rowCount ?? 0) === 0) return null;
  return getCopyItemById(id);
}

/** 删除文案（仅管理员可调用） */
export async function deleteCopyItem(id: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM wenan_copy_items WHERE id = $1", [
    Number(id),
  ]);
  return (rowCount ?? 0) > 0;
}

/** 批量删除文案，返回实际删除条数 */
export async function deleteCopyItemsBatch(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const nums = ids.map((id) => Number(id)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  const { rowCount } = await query(
    "DELETE FROM wenan_copy_items WHERE id = ANY($1::bigint[])",
    [nums]
  );
  return rowCount ?? 0;
}

/* ---------------- 用户后台：我的收藏 / 我的投稿 ---------------- */

interface MyCopyRow {
  id: number;
  title: string;
  content: string;
  category_id: number;
  category_label: string;
  category_color: string;
  status: CopyStatus;
  updated_at: Date | string;
  review_reason: string;
}

/** 用户后台列表：收藏或收藏/投稿超过 50 条时由调用方启用分页 */
export interface MyListPage {
  items: MyCopyItem[];
  total: number;
}

function mapMyRow(row: MyCopyRow): MyCopyItem {
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    categoryId: String(row.category_id),
    categoryLabel: row.category_label,
    categoryColor: normalizeCategoryColor(row.category_color),
    // 自己的收藏/投稿在用户后台里 favorite 无实际意义，默认 true 即可
    favorite: true,
    status: row.status,
    updatedAt: formatDate(row.updated_at),
    reviewReason: row.review_reason,
  };
}

/** 我的收藏（按收藏时间倒序），limit<=0 表示不分页 */
export async function getMyFavorites(
  userId: number,
  limit: number,
  offset: number
): Promise<MyListPage> {
  const { rows: countRows } = await query<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM wenan_user_favorites fav JOIN wenan_copy_items c ON c.id=fav.copy_id WHERE fav.user_id = $1 AND c.deleted_at IS NULL",
    [userId]
  );
  const total = countRows[0]?.total ?? 0;

  const paging = limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : "";
  const { rows } = await query<MyCopyRow>(
    `SELECT c.id, c.title, c.content, c.category_id,
            cat.label AS category_label, cat.color AS category_color,
            c.status, c.updated_at, c.review_reason
     FROM wenan_user_favorites fav
     JOIN wenan_copy_items c ON c.id = fav.copy_id
     JOIN wenan_categories cat ON cat.id = c.category_id
     WHERE fav.user_id = $1 AND c.deleted_at IS NULL
     ORDER BY fav.created_at DESC, c.id DESC
     ${paging}`,
    [userId]
  );

  return { items: rows.map(mapMyRow), total };
}

/** 我的投稿（按更新时间倒序） */
export async function getMySubmissions(
  userId: number,
  limit: number,
  offset: number
): Promise<MyListPage> {
  const { rows: countRows } = await query<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM wenan_copy_items WHERE user_id = $1 AND deleted_at IS NULL",
    [userId]
  );
  const total = countRows[0]?.total ?? 0;

  const paging = limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : "";
  const { rows } = await query<MyCopyRow>(
    `SELECT c.id, c.title, c.content, c.category_id,
            cat.label AS category_label, cat.color AS category_color,
            c.status, c.updated_at, c.review_reason
     FROM wenan_copy_items c
     JOIN wenan_categories cat ON cat.id = c.category_id
     WHERE c.user_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.updated_at DESC, c.id DESC
     ${paging}`,
    [userId]
  );

  return { items: rows.map(mapMyRow), total };
}

/** 批量取消收藏（只能操作自己的），返回实际取消条数 */
export async function removeFavorites(
  userId: number,
  ids: number[]
): Promise<number> {
  if (ids.length === 0) return 0;
  const { rowCount } = await query(
    "DELETE FROM wenan_user_favorites WHERE user_id = $1 AND copy_id = ANY($2::bigint[])",
    [userId, ids]
  );
  return rowCount ?? 0;
}

/* ---------------- 批量导入（管理员） ---------------- */

/**
 * 批量插入公共文案（user_id=NULL、status=approved）。
 * 单条多值 INSERT 一次完成，createdAt 已为 YYYY-MM-DD（可缺省）。
 * 返回实际插入条数。
 */
export async function bulkInsertCopyItems(
  categoryId: string,
  items: ParsedCopyInput[]
): Promise<number> {
  if (items.length === 0) return 0;

  const params: unknown[] = [];
  const valueRows: string[] = [];
  for (const item of items) {
    const base = params.length + 1;
    valueRows.push(
      `($${base}, $${base + 1}, $${base + 2}, NULL, 'approved', COALESCE($${base + 3}::date, CURRENT_DATE))`
    );
    params.push(
      item.title.trim(),
      item.content.trim(),
      Number(categoryId),
      item.createdAt ? normalizeDate(item.createdAt) : null
    );
  }

  const sql = `INSERT INTO wenan_copy_items
       (title, content, category_id, user_id, status, updated_at)
     VALUES ${valueRows.join(", ")}
     RETURNING id`;
  const { rows } = await query<{ id: number }>(sql, params);
  return rows.length;
}

/* ---------------- 数据可视化统计 ---------------- */

export interface OverviewStats {
  userCount: number;
  copyCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  favoriteCount: number;
  pendingFeedbackCount: number;
  categoryCount: number;
}

/** 全局概览：各项计数（少量聚合查询合并） */
export async function getOverviewStats(): Promise<OverviewStats> {
  const { rows: copyRows } = await query<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }>(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
      FROM wenan_copy_items WHERE deleted_at IS NULL`);
  const c = copyRows[0] ?? {
    total: 0, approved: 0, pending: 0, rejected: 0,
  };

  const { rows: scalarRows } = await query<{
    users: number;
    favs: number;
    pending_fb: number;
    cats: number;
  }>(`SELECT
        (SELECT COUNT(*) FROM wenan_users)::int AS users,
        (SELECT COUNT(*) FROM wenan_user_favorites)::int AS favs,
        (SELECT COUNT(*) FROM wenan_feedbacks WHERE status = 'pending')::int AS pending_fb,
        (SELECT COUNT(*) FROM wenan_categories)::int AS cats`);
  const s = scalarRows[0] ?? { users: 0, favs: 0, pending_fb: 0, cats: 0 };

  return {
    userCount: s.users,
    copyCount: c.total,
    approvedCount: c.approved,
    pendingCount: c.pending,
    rejectedCount: c.rejected,
    favoriteCount: s.favs,
    pendingFeedbackCount: s.pending_fb,
    categoryCount: s.cats,
  };
}

export interface TopFavoritedItem {
  id: string;
  title: string;
  categoryId: string;
  categoryColor: string;
  favCount: number;
}

/**
 * 收藏排行榜 TOP N。
 * onlyApproved=true 时只统计已通过文案（首页用）；管理员端不过滤。
 */
export async function getTopFavorited(
  limit: number,
  onlyApproved = false
): Promise<TopFavoritedItem[]> {
  const where = onlyApproved
    ? "WHERE c.status = 'approved' AND c.deleted_at IS NULL"
    : "WHERE c.deleted_at IS NULL";
  const { rows } = await query<{
    id: number;
    title: string;
    category_id: number;
    color: string;
    fav_count: number;
  }>(
    `SELECT c.id, c.title, c.category_id, cat.color,
            COUNT(f.user_id)::int AS fav_count
     FROM wenan_copy_items c
     JOIN wenan_user_favorites f ON f.copy_id = c.id
     JOIN wenan_categories cat ON cat.id = c.category_id
     ${where}
     GROUP BY c.id, c.title, c.category_id, cat.color
     ORDER BY fav_count DESC, c.id DESC
     LIMIT ${Math.max(1, Math.floor(limit))}`
  );
  return rows.map((r) => ({
    id: String(r.id),
    title: r.title,
    categoryId: String(r.category_id),
    categoryColor: normalizeCategoryColor(r.color),
    favCount: r.fav_count,
  }));
}

export interface CategoryDistributionItem {
  id: string;
  label: string;
  color: string;
  count: number;
}

/** 类目分布（各类目下文案数量） */
export async function getCategoryDistribution(): Promise<
  CategoryDistributionItem[]
> {
  const { rows } = await query<{
    id: number;
    label: string;
    color: string;
    count: number;
  }>(`SELECT cat.id, cat.label, cat.color,
             COUNT(c.id)::int AS count
      FROM wenan_categories cat
      LEFT JOIN wenan_copy_items c ON c.category_id = cat.id
      GROUP BY cat.id, cat.label, cat.color
      ORDER BY count DESC, cat.sort_order ASC`);
  return rows.map((r) => ({
    id: String(r.id),
    label: r.label,
    color: normalizeCategoryColor(r.color),
    count: r.count,
  }));
}

export interface TopContributorItem {
  userId: string;
  nickname: string;
  submissionCount: number;
}

/** 投稿活跃榜 TOP N（按用户创建文案数，含各状态） */
export async function getTopContributors(
  limit: number
): Promise<TopContributorItem[]> {
  const { rows } = await query<{
    user_id: number;
    nickname: string;
    sub_count: number;
  }>(
    `SELECT c.user_id, u.nickname, COUNT(*)::int AS sub_count
     FROM wenan_copy_items c
     JOIN wenan_users u ON u.id = c.user_id
     GROUP BY c.user_id, u.nickname
     ORDER BY sub_count DESC, c.user_id ASC
     LIMIT ${Math.max(1, Math.floor(limit))}`
  );
  return rows.map((r) => ({
    userId: String(r.user_id),
    nickname: r.nickname,
    submissionCount: r.sub_count,
  }));
}

export interface RecentUserItem {
  userId: string;
  nickname: string;
  createdAt: string;
  submissionCount: number;
}

/** 最近注册用户（附投稿数） */
export async function getRecentUsers(
  limit: number
): Promise<RecentUserItem[]> {
  const { rows } = await query<{
    id: number;
    nickname: string;
    created_at: Date | string;
    sub_count: number;
  }>(
    `SELECT u.id, u.nickname, u.created_at,
            COUNT(c.id)::int AS sub_count
     FROM wenan_users u
     LEFT JOIN wenan_copy_items c ON c.user_id = u.id
     GROUP BY u.id, u.nickname, u.created_at
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ${Math.max(1, Math.floor(limit))}`
  );
  return rows.map((r) => ({
    userId: String(r.id),
    nickname: r.nickname,
    createdAt: formatDate(r.created_at),
    submissionCount: r.sub_count,
  }));
}

/**
 * 软删除自己的投稿（进入回收站，冷静期内可恢复）。
 * 已被 ≥ favoriteThreshold 人收藏的文案受社区保护，不允许作者单方面删除。
 * 返回实际软删 id 与受保护 id（含收藏数）。
 */
export async function softDeleteMySubmissions(
  userId: number,
  ids: number[],
  favoriteThreshold: number
): Promise<{
  deleted: number[];
  protected: { id: number; favCount: number }[];
}> {
  if (ids.length === 0) return { deleted: [], protected: [] };

  // 归属 + 收藏数（仅未删除）
  const { rows } = await query<{ id: number; fav_count: number }>(
    `SELECT c.id, COUNT(f.user_id)::int AS fav_count
     FROM wenan_copy_items c
     LEFT JOIN wenan_user_favorites f ON f.copy_id = c.id
     WHERE c.user_id = $1 AND c.id = ANY($2::bigint[]) AND c.deleted_at IS NULL
     GROUP BY c.id`,
    [userId, ids]
  );

  const protectedRows = rows.filter((r) => r.fav_count >= favoriteThreshold);
  const deletable = rows
    .filter((r) => r.fav_count < favoriteThreshold)
    .map((r) => r.id);

  if (deletable.length > 0) {
    await query(
      `UPDATE wenan_copy_items
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND id = ANY($2::bigint[]) AND deleted_at IS NULL`,
      [userId, deletable]
    );
  }

  return {
    deleted: deletable,
    protected: protectedRows.map((r) => ({ id: r.id, favCount: r.fav_count })),
  };
}

/** 从回收站恢复自己的投稿，返回恢复条数 */
export async function restoreMySubmissions(
  userId: number,
  ids: number[]
): Promise<number> {
  if (ids.length === 0) return 0;
  const { rowCount } = await query(
    `UPDATE wenan_copy_items SET deleted_at = NULL
     WHERE user_id = $1 AND id = ANY($2::bigint[]) AND deleted_at IS NOT NULL`,
    [userId, ids]
  );
  return rowCount ?? 0;
}

/** 回收站列表（已软删的我的投稿），limit<=0 不分页 */
export async function getRecycleBin(
  userId: number,
  limit: number,
  offset: number
): Promise<MyListPage> {
  const { rows: countRows } = await query<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM wenan_copy_items WHERE user_id = $1 AND deleted_at IS NOT NULL",
    [userId]
  );
  const total = countRows[0]?.total ?? 0;
  const paging = limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : "";
  const { rows } = await query<MyCopyRow>(
    `SELECT c.id, c.title, c.content, c.category_id,
            cat.label AS category_label, cat.color AS category_color,
            c.status, c.updated_at, c.review_reason
     FROM wenan_copy_items c
     JOIN wenan_categories cat ON cat.id = c.category_id
     WHERE c.user_id = $1 AND c.deleted_at IS NOT NULL
     ORDER BY c.deleted_at DESC, c.id DESC
     ${paging}`,
    [userId]
  );
  return { items: rows.map(mapMyRow), total };
}

/**
 * 物理删除已过冷静期的软删文案（连带收藏 CASCADE）。
 * 分批限量执行（cron 调用），返回删除条数；graceDays 为冷静期天数。
 */
export async function purgeExpiredDeleted(
  graceDays: number,
  batchSize: number
): Promise<number> {
  const limit = Math.max(1, Math.min(500, Math.floor(batchSize)));
  const { rowCount } = await query(
    `DELETE FROM wenan_copy_items
     WHERE id IN (
       SELECT id FROM wenan_copy_items
       WHERE deleted_at IS NOT NULL
         AND deleted_at < CURRENT_TIMESTAMP - ($1 || ' days')::interval
       LIMIT ${limit}
     )`,
    [Math.max(0, Math.floor(graceDays))]
  );
  return rowCount ?? 0;
}

/**
 * 注销账号并匿名化：
 * - 已通过（approved）投稿：解除作者关联（user_id=NULL），内容匿名保留；
 * - 待审/被拒（pending/rejected）投稿：软删（不进入公开站点）。
 * - 账号：置 deactivated_at、昵称改为「已注销用户#id」、清空头像。
 * 调用方应在校验密码后执行，并在成功后清除登录 cookie。
 */
export async function deactivateAndAnonymize(
  userId: number
): Promise<{ anonymized: number; softDeleted: number }> {
  const anonymized =
    (
      await query(
        `UPDATE wenan_copy_items SET user_id = NULL
         WHERE user_id = $1 AND status = 'approved' AND deleted_at IS NULL`,
        [userId]
      )
    ).rowCount ?? 0;

  const softDeleted =
    (
      await query(
        `UPDATE wenan_copy_items SET deleted_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND status IN ('pending','rejected') AND deleted_at IS NULL`,
        [userId]
      )
    ).rowCount ?? 0;

  await query(
    `UPDATE wenan_users
     SET deactivated_at = CURRENT_TIMESTAMP,
         nickname = '已注销用户#' || id,
         avatar_url = '',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );

  return { anonymized, softDeleted };
}

/** 校验投稿归属：该文案是否存在（未删除）且属于该用户 */
export async function isOwnedSubmission(
  userId: number,
  id: string
): Promise<boolean> {
  const { rowCount } = await query(
    "SELECT 1 FROM wenan_copy_items WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
    [Number(id), userId]
  );
  return (rowCount ?? 0) > 0;
}

/**
 * 用户修改自己的投稿（归属校验在 WHERE 内，防越权）。
 * status 由机审结果决定（approved/pending）；同时清空旧拒绝原因、刷新 updated_at。
 */
export async function updateMySubmission(
  userId: number,
  id: string,
  data: {
    title: string;
    content: string;
    categoryId: string;
    status: CopyStatus;
  }
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE wenan_copy_items
     SET title = $1, content = $2, category_id = $3,
         status = $4, review_reason = '', updated_at = CURRENT_DATE
     WHERE id = $5 AND user_id = $6`,
    [
      data.title,
      data.content,
      Number(data.categoryId),
      data.status,
      Number(id),
      userId,
    ]
  );
  return (rowCount ?? 0) > 0;
}

// ============ 审核日志 ============

export type ReviewLogMethod = "keyword" | "ai" | "auto" | "manual" | "schedule";

export interface ReviewLogItem {
  id: string;
  copyId: string;
  copyTitle: string;
  method: ReviewLogMethod;
  decision: "approved" | "rejected" | "pending";
  reason: string;
  createdAt: string;
}

/** 写入一条审核日志 */
export async function insertReviewLog(input: {
  copyId?: string | number | null;
  copyTitle: string;
  userId?: number | null;
  method: ReviewLogMethod;
  decision: "approved" | "rejected" | "pending";
  reason?: string;
}): Promise<void> {
  await query(
    `INSERT INTO wenan_review_logs
       (copy_id, copy_title, user_id, method, decision, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.copyId ? Number(input.copyId) : null,
      input.copyTitle,
      input.userId ?? null,
      input.method,
      input.decision,
      input.reason ?? "",
    ]
  );

  // 按设置保留条数清理最旧记录
  const { rows } = await query<{ value: string }>(
    "SELECT value FROM wenan_site_settings WHERE key = 'review_log_retention'"
  );
  const limitNum = Number(rows[0]?.value);
  if (Number.isFinite(limitNum) && limitNum > 0) {
    await query(
      `DELETE FROM wenan_review_logs
       WHERE id IN (
         SELECT id FROM wenan_review_logs
         ORDER BY created_at DESC, id DESC
         OFFSET $1
       )`,
      [limitNum]
    );
  }
}

/** 读取最近审核日志（admin 展示） */
export async function getReviewLogs(limit: number): Promise<ReviewLogItem[]> {
  const { rows } = await query<{
    id: number;
    copy_id: number | null;
    copy_title: string;
    method: ReviewLogMethod;
    decision: "approved" | "rejected" | "pending";
    reason: string;
    created_at: Date | string;
  }>(
    `SELECT id, copy_id, copy_title, method, decision, reason, created_at
     FROM wenan_review_logs
     ORDER BY created_at DESC, id DESC
     LIMIT ${Math.max(1, Math.floor(limit))}`
  );
  return rows.map((row) => ({
    id: String(row.id),
    copyId: row.copy_id ? String(row.copy_id) : "",
    copyTitle: row.copy_title,
    method: row.method,
    decision: row.decision,
    reason: row.reason,
    createdAt: formatDate(row.created_at, "datetime"),
  }));
}
