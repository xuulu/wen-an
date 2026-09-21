/** 批量导入单条输入（解析后、未校验） */
export interface ParsedCopyInput {
  title: string;
  content: string;
  tags: string[];
  createdAt?: string;
}

/** 批量导入解析结果：items 与错误清单（带行号/索引） */
export interface ParseResult {
  items: ParsedCopyInput[];
  errors: string[];
  /** 识别出的格式 */
  format: "json" | "txt";
}

/** 单条文案长度上限（单条投稿与批量导入共用） */
export const TITLE_MAX = 80;
export const CONTENT_MIN = 5;
export const CONTENT_MAX = 5000;
export const TAG_MAX_COUNT = 10;
export const TAG_MAX_LEN = 20;

const DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * 兼容多种时间格式，统一归一化为 YYYY-MM-DD。
 * - YYYY-MM-DD / YYYY-M-D（月日单位数自动补零，校验合法日期）
 * - Unix 时间戳：10 位按秒、13 位按毫秒
 * 无法识别返回 null。
 */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // 纯数字：时间戳
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isSafeInteger(n)) return null;
    let ms: number;
    if (s.length === 10) ms = n * 1000;
    else if (s.length === 13) ms = n;
    else return null;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return formatDateParts(d);
  }

  // YYYY-M-D
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const daysInMonth = [
    31,
    isLeap(y) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  if (d > daysInMonth[mo - 1]) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDateParts(d: Date): string {
  // 用本地分量：pg date 列按本地时区解析，UTC 分量在 UTC+8 会偏移一天
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * 切分 txt 标签字段：英文逗号 / 中文逗号均可
 * 空字符串返回空数组
 */
function parseTags(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** 校验单条，返回错误信息（无错误返回 null） */
export function validateBatchItem(
  item: ParsedCopyInput,
  index: number
): string | null {
  const where = `第 ${index + 1} 条`;
  const title = item.title.trim();
  if (title.length === 0) return `${where}标题不能为空`;
  if (title.length > TITLE_MAX)
    return `${where}标题超过 ${TITLE_MAX} 字`;

  const content = item.content.trim();
  if (content.length < CONTENT_MIN)
    return `${where}正文不能少于 ${CONTENT_MIN} 字`;
  if (content.length > CONTENT_MAX)
    return `${where}正文超过 ${CONTENT_MAX} 字`;

  const tags = item.tags ?? [];
  if (tags.length > TAG_MAX_COUNT)
    return `${where}标签超过 ${TAG_MAX_COUNT} 个`;
  for (const tag of tags) {
    if (typeof tag !== "string" || tag.length === 0 || tag.length > TAG_MAX_LEN)
      return `${where}标签长度须在 1-${TAG_MAX_LEN} 字`;
  }

  if (item.createdAt !== undefined && normalizeDate(item.createdAt) === null)
    return `${where}时间格式错误，支持 YYYY-MM-DD 或 Unix 时间戳`;

  return null;
}

/**
 * 解析批量导入输入文本，自动识别 json / txt 格式。
 * - json：顶层必须是数组（单个对象自动包装），每项需含 title/content（string），tags/createdAt 可选
 * - txt：每行一条，字段以 | 分隔，顺序 标题|正文|标签(逗号,可选)|创建时间(可选)
 * - 对每条做校验；只要有任何一条解析或校验失败，整批拒绝（items 返回空）
 * - 条数无上限
 */
export function parseBatchInput(rawText: string): ParseResult {
  const text = rawText ?? "";
  if (text.trim().length === 0) {
    return {
      items: [],
      errors: ["输入内容为空"],
      format: "txt",
    };
  }

  const trimmed = text.trim();
  const isJson = trimmed[0] === "[" || trimmed[0] === "{";
  const format: "json" | "txt" = isJson ? "json" : "txt";

  let parsed: ParsedCopyInput[] = [];
  const errors: string[] = [];

  if (format === "json") {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        items: [],
        errors: [`JSON 解析失败：${msg}`],
        format: "json",
      };
    }
    let arr: unknown[];
    if (Array.isArray(data)) {
      arr = data;
    } else if (data && typeof data === "object") {
      arr = [data];
    } else {
      return {
        items: [],
        errors: ["JSON 顶层必须是数组"],
        format: "json",
      };
    }
    for (let i = 0; i < arr.length; i++) {
      const row = arr[i];
      if (!row || typeof row !== "object") {
        errors.push(`第 ${i + 1} 条不是对象`);
        continue;
      }
      const r = row as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title : "";
      const content = typeof r.content === "string" ? r.content : "";
      const tags = Array.isArray(r.tags)
        ? r.tags.filter(
            (t): t is string => typeof t === "string" && t.length > 0
          )
        : [];
      const createdAt =
        typeof r.createdAt === "string" ? r.createdAt : undefined;
      parsed.push({ title, content, tags, createdAt });
    }
  } else {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      const fields = line.split("|").map((s) => s.trim());
      if (fields.length < 2) {
        errors.push(`第 ${i + 1} 行字段不足，至少需要「标题|正文」`);
        continue;
      }
      const [title, content, tagsRaw, createdAtRaw] = fields;
      const item: ParsedCopyInput = {
        title: title ?? "",
        content: content ?? "",
        tags: parseTags(tagsRaw ?? ""),
      };
      if (createdAtRaw && createdAtRaw.length > 0) {
        item.createdAt = createdAtRaw;
      }
      parsed.push(item);
    }
  }

  if (errors.length > 0) {
    return { items: [], errors, format };
  }

  for (let i = 0; i < parsed.length; i++) {
    const err = validateBatchItem(parsed[i], i);
    if (err) errors.push(err);
  }

  if (errors.length > 0) {
    return { items: [], errors, format };
  }

  // createdAt 归一化（解析已通过，这里把单位数月日/时间戳统一为 YYYY-MM-DD）
  parsed = parsed.map((item) =>
    item.createdAt
      ? { ...item, createdAt: normalizeDate(item.createdAt) ?? item.createdAt }
      : item
  );

  return { items: parsed, errors, format };
}
