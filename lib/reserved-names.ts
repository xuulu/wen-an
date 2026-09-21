/**
 * 昵称保留词校验：防止用户注册冒充官方、管理员或使用违规名称。
 * 规则：
 * 1) 完整匹配保留词（不区分大小写）
 * 2) 包含保留词根（如「管理员」「官方」「客服」），防「xx管理员」
 */

/** 完整保留：精确等于即拒绝 */
const RESERVED_EXACT = [
  "admin",
  "administrator",
  "root",
  "system",
  "system",
  "official",
  "demo",
  "test",
  "guest",
  "user",
  "users",
  "简心",
  "简心文案",
  "简心文案库",
  "站长",
  "版主",
];

/** 包含保留：昵称含这些词即拒绝 */
const RESERVED_CONTAINS = [
  "管理员",
  "官方",
  "客服",
  "系统",
  "admin",
  "root",
  "系统通知",
];

/** 返回拒绝原因；可用则 null */
export function checkReservedNickname(raw: string): string | null {
  const nickname = raw.trim();
  const lower = nickname.toLowerCase();

  if (RESERVED_EXACT.some((word) => lower === word.toLowerCase())) {
    return "该用户名为系统保留，不可使用";
  }
  if (RESERVED_CONTAINS.some((word) => lower.includes(word.toLowerCase()))) {
    return "用户名不能包含「管理员、官方、客服、系统」等保留词";
  }
  return null;
}
