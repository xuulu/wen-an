import { NextResponse } from "next/server";
import { getAdminUser, getCurrentUser } from "@/lib/auth";
import { createCopyItem, getCopyItems } from "@/lib/copywriting-data";
import type { CopyStatus } from "@/lib/copywriting";

/** 公开：分页获取文案列表，支持关键词搜索（标题/正文/类目）、随机种子排序 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize")) || 10)
  );
  const categoryId = searchParams.get("categoryId") ?? "all";
  const search = searchParams.get("search")?.trim() || undefined;
  const requestedStatus = searchParams.get("status");
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "random" ? "random" : "updated";
  const seedRaw = Number(searchParams.get("seed"));
  const randomSeed =
    sort === "random" && Number.isFinite(seedRaw)
      ? Math.floor(seedRaw)
      : undefined;

  const [admin, currentUser] = await Promise.all([
    getAdminUser(),
    getCurrentUser(),
  ]);

  // 非管理员只能看到已通过的文案；status 参数仅对管理员生效
  let status: "all" | CopyStatus = "approved";
  if (
    admin &&
    (requestedStatus === "all" ||
      requestedStatus === "pending" ||
      requestedStatus === "approved" ||
      requestedStatus === "rejected")
  ) {
    status = requestedStatus;
  }

  const result = await getCopyItems({
    categoryId,
    userId: currentUser?.id ?? 0,
    pagination: { page, pageSize },
    search,
    status,
    sort,
    randomSeed,
  });
  return NextResponse.json(result);
}

/** 仅管理员：新建文案（公共文案，直接生效） */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    content?: string;
    categoryId?: string;
  } | null;

  const title = body?.title?.trim();
  const content = body?.content?.trim();
  const categoryId = body?.categoryId;

  if (!title || !content || !categoryId) {
    return NextResponse.json(
      { error: "标题、内容、类目不能为空" },
      { status: 400 }
    );
  }

  const item = await createCopyItem({ title, content, categoryId });
  return NextResponse.json(item, { status: 201 });
}
