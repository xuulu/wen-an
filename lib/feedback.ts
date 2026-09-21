/** 用户意见反馈类型 */
export type FeedbackType = "bug" | "suggestion" | "complaint" | "other";

/** 反馈处理状态：pending 待处理 / replied 已回复 / closed 已关闭 */
export type FeedbackStatus = "pending" | "replied" | "closed";

export interface Feedback {
  id: string;
  userId: string;
  username: string;
  type: FeedbackType;
  content: string;
  contact: string;
  adminReply: string;
  status: FeedbackStatus;
  createdAt: string;
}

export const feedbackTypeLabels: Record<FeedbackType, string> = {
  bug: "问题故障",
  suggestion: "功能建议",
  complaint: "投诉意见",
  other: "其他反馈",
};

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  pending: "待处理",
  replied: "已回复",
  closed: "已关闭",
};

export const feedbackTypeStyles: Record<FeedbackType, string> = {
  bug: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  suggestion:
    "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  complaint:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  other: "bg-muted text-muted-foreground",
};

export const feedbackStatusStyles: Record<FeedbackStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  replied:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};

export const FEEDBACK_TYPES: FeedbackType[] = [
  "bug",
  "suggestion",
  "complaint",
  "other",
];
