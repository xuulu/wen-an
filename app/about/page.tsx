import type { Metadata } from "next";

import { LegalPage } from "@/components/library/legal-page";
import { buildSeoMetadata, getSeoContext } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    title: "关于我们",
    description:
      "简心文案库是一个精选文案分享社区，提供朋友圈、短视频、节日祝福等分类文案的搜索、收藏与一键复制。",
    path: "/about",
  });
}

export default async function AboutPage() {
  const ctx = await getSeoContext();
  const { siteName } = ctx;

  return (
    <LegalPage
      title={`关于${siteName}`}
      updated="2026-09-24"
      intro={`${siteName} 是一个开放的精选文案分享社区，希望让每一次表达都有灵感，也让好文案被更多人看见。`}
      sections={[
        {
          heading: "我们在做什么",
          paras: [
            `在 ${siteName}，你可以按分类浏览或通过关键词快速找到朋友圈、短视频、小红书、节日祝福、诗句等各类文案，并一键复制、收藏喜欢的内容。`,
            "我们也欢迎每一位用户注册并投稿，把你收集或创作的好文案分享给社区，共建一个丰富、好用的文案灵感库。",
          ],
        },
        {
          heading: "内容从哪里来",
          list: [
            "官方整理与预置的公共文案；",
            "社区用户的投稿（所有投稿均经过关键词与 AI 机审、人工复核）；",
            "我们尊重原创与版权，侵权内容可随时投诉删除。",
          ],
        },
        {
          heading: "我们在意的事",
          list: [
            "内容安全：违法、低俗、侵权内容一律不予放行；",
            "体验与性能：快速搜索、流畅复制，持续优化访问速度；",
            "隐私保护：最小化收集信息，密码加密存储，绝不售卖个人信息。",
          ],
        },
        {
          heading: "加入我们",
          paras: [
            "注册账号即可投稿、收藏与反馈意见。内容合作、建议或其他事宜，欢迎通过「联系我们」与我们沟通。",
          ],
        },
      ]}
      related={[
        { href: "/contact", label: "联系我们" },
        { href: "/terms", label: "用户协议" },
        { href: "/user", label: "注册 / 投稿" },
      ]}
    />
  );
}
