import type { Metadata } from "next";

import { LegalPage } from "@/components/library/legal-page";
import { buildSeoMetadata, getSeoContext } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    title: "联系我们",
    description:
      "联系简心文案库：投稿合作、意见反馈、版权与侵权投诉等事务的联系方式与处理说明。",
    path: "/contact",
  });
}

export default async function ContactPage() {
  const ctx = await getSeoContext();
  const { siteName } = ctx;
  const lines = ctx.settings.footer_contact
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const contactNodes =
    lines.length > 0
      ? lines.map((line, i) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line) ? (
            <a
              key={line}
              href={`mailto:${line}`}
              className="text-cyan-600 underline-offset-4 hover:underline dark:text-cyan-400"
            >
              邮箱：{line}
            </a>
          ) : (
            <span key={`${line}-${i}`}>{line}</span>
          )
        )
      : ["暂未公开联系方式，您可通过个人中心的「意见反馈」与我们联系。"];

  return (
    <LegalPage
      title="联系我们"
      updated="2026-09-24"
      intro={`欢迎就以下事务与 ${siteName} 取得联系，我们会在合理时间内处理。`}
      sections={[
        {
          heading: "联系方式",
          custom: contactNodes,
        },
        {
          heading: "事务类型",
          list: [
            "意见与建议、Bug 反馈：可在个人中心「意见反馈」提交，处理更便捷；",
            "投稿合作、内容共建：欢迎注册后直接投稿，或邮件说明合作意向；",
            "版权 / 侵权投诉：请按「版权声明与侵权投诉」页面要求提交通知材料；",
            "其他事务：账号、隐私、商务等均可通过上述方式联系。",
          ],
        },
        {
          heading: "响应说明",
          paras: [
            "我们通常会在收到信息后的数个工作日内回复；侵权投诉等紧急事项会优先处理。为便于核实与回复，请尽量提供清晰的事由、相关页面链接与有效联系方式。",
          ],
        },
      ]}
      related={[
        { href: "/copyright", label: "版权与侵权投诉" },
        { href: "/about", label: "关于我们" },
        { href: "/user", label: "意见反馈" },
      ]}
    />
  );
}
