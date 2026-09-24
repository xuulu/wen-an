import type { Metadata } from "next";

import { LegalPage } from "@/components/library/legal-page";
import { buildSeoMetadata, getSeoContext } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    title: "版权声明与侵权投诉",
    description:
      "简心文案库版权声明、侵权（著作权）投诉通知与反通知流程，权利人可据此提交侵权投诉。",
    path: "/copyright",
  });
}

/** 从站点设置的联系信息中提取邮箱 */
function getEmail(contact: string): string {
  const line = contact
    .split("\n")
    .map((s) => s.trim())
    .find((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  return line ?? "";
}

export default async function CopyrightPage() {
  const ctx = await getSeoContext();
  const { siteName } = ctx;
  const email = getEmail(ctx.settings.footer_contact);
  const mailLine = email
    ? `请通过邮件联系我们：${email}（建议标题注明「侵权投诉」）。`
    : "请通过页脚「联系我们」中的方式与我们取得联系。";

  return (
    <LegalPage
      title="版权声明与侵权投诉"
      updated="2026-09-24"
      intro={`${siteName} 尊重并保护知识产权，要求用户在投稿时遵守法律法规、不侵犯他人合法权益。本页说明版权归属、侵权投诉（通知）与反通知的处理流程。`}
      sections={[
        {
          heading: "版权归属",
          paras: [
            `本站为用户提供文案信息存储空间，用户投稿的内容（含文字、图片等）著作权归原作者或其他合法权利人所有，${siteName} 不主张其所有权。`,
            "公共预置文案及本站自行创作、整理的内容，其著作权按法律规定归本站或相应权利人所有；转载内容均尽可能标注来源，若有遗漏请及时告知。",
            "任何单位或个人转载、使用本站内容，应注明作者与来源，并遵守相关法律法规；商业用途须取得权利人书面授权。",
          ],
        },
        {
          heading: "侵权投诉（权利通知）",
          paras: [
            "若您认为本站用户投稿的内容侵犯了您的著作权或其他合法权益，请向我们提交书面权利通知。我们在收到并核实后，将依法及时删除涉嫌侵权内容或断开相关链接。",
            "为便于快速处理，通知请尽量包含以下材料：",
          ],
          ordered: [
            "权利人的姓名（名称）、联系方式（电话、邮箱、地址）及有效身份证明；",
            "权利归属证明，如著作权登记证书、作品首发凭证、授权书等；",
            "涉嫌侵权内容的准确名称、所在页面网址（URL）及具体位置，确保我们能够定位；",
            "侵权事实的初步说明（如未经授权使用、抄袭比对等）；",
            "通知内容真实的声明：若通知不实，您愿意承担由此造成的全部法律责任。",
          ],
        },
        {
          heading: "处理流程",
          ordered: [
            "我们收到通知后将尽快进行形式与初步实质审核；",
            "材料齐全、侵权事实较为明确的，及时删除内容或断开链接，并记录处理结果；",
            "必要时将通知转送给投稿用户，并可依法向其告知您的联系方式以便双方解决争议；",
            "对多次提交侵权内容的用户，我们有权限制或终止其投稿权限。",
          ],
        },
        {
          heading: "反通知（被投诉方）",
          paras: [
            "若投稿内容因投诉被删除，而您认为内容并不侵权，可向我们提交书面反通知，说明不侵权理由并提供权属或授权证明、真实联系方式及真实性声明。我们收到合格反通知后，可依法恢复相关内容，并由双方依法解决争议。",
          ],
        },
        {
          heading: "联系方式与免责",
          paras: [
            mailLine,
            "本站对用户投稿内容承担信息存储空间服务提供者的责任，依据《中华人民共和国著作权法》《信息网络传播权保护条例》等规定处理侵权事宜；在不知情且无明显侵权情形下，适用「通知—删除」的避风港规则。",
            "恶意投诉、虚假陈述给本站或他人造成损失的，由投诉方承担相应法律责任。",
          ],
        },
      ]}
      related={[
        { href: "/contact", label: "联系我们" },
        { href: "/terms", label: "用户协议" },
        { href: "/user", label: "意见反馈" },
      ]}
    />
  );
}
