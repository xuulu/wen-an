import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import {
  getPendingCopyItems,
  setCopyItemStatus,
  setCopyItemsStatusBatch,
} from "@/lib/copywriting-data";
import { runReview } from "@/lib/review-engine";

/**
 * 仅管理员：一键审核全部待审文案（关键词 + AI）。
 * 返回 { approved, rejected, details }
 */
export async function POST() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const pending = await getPendingCopyItems();
  const approvedIds: string[] = [];
  const details: { id: string; title: string; decision: string; reason: string }[] = [];

  for (const item of pending) {
    const outcome = await runReview({
      ...item,
      options: { copyId: item.id },
    });
    details.push({
      id: item.id,
      title: item.title,
      decision: outcome.decision,
      reason: outcome.reason,
    });
    if (outcome.decision === "approved") approvedIds.push(item.id);
  }

  if (approvedIds.length) await setCopyItemsStatusBatch(approvedIds, "approved");
  // 拒绝逐条写入，保留各自原因供投稿用户查看
  await Promise.all(
    details
      .filter((d) => d.decision === "rejected")
      .map((d) => setCopyItemStatus(d.id, "rejected", d.reason))
  );

  return NextResponse.json({
    total: pending.length,
    approved: approvedIds.length,
    rejected: details.filter((d) => d.decision === "rejected").length,
    details,
  });
}
