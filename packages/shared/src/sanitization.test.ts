import { describe, expect, it } from "vitest";

import { cleanJobPostingInput } from "./sanitization";

describe("cleanJobPostingInput", () => {
  it("cleans Boss protected digits, style noise and unrelated page text", () => {
    const cleaned = cleanJobPostingInput({
      platform: "boss",
      title: "前端开发(React+双休大厂全额公积金)\ue032\ue036-\ue033\ue031K",
      salaryText: "\ue032\ue036-\ue033\ue031K",
      companyName: "深圳·南山区·科技园",
      jdRaw: [
        "前端开发实习生\ue0b2\ue0b6\ue0b1-\ue0b3\ue0b1\ue0b1元/天深圳7天/周 6个月本科收藏立即沟通举报微信扫码分享",
        ".CsCNszmdwSA{display:none!important;}.XkQXGiaHHr{display:inline-block;font-size:0!important;}",
        "岗位职直聘责:",
        "1.3D可视来自BOSS直聘化开发: 参与智慧kanzhun城市、智慧BOSS直聘园区项目的Web前boss端建设。",
        "任职要求:",
        "熟悉React框架者优先。",
        "孟凡霞 在线 飞渡科技股份有限公司 · HR 去App与BOSS随时沟通",
        "工作地址深圳南山区深圳国家工程实验室大楼-A栋",
        "热门职位 热门城市 热门企业 附近城市 深圳硬件测试招聘"
      ].join("\n")
    });

    expect(cleaned.title).toBe("前端开发(React+双休大厂全额公积金)");
    expect(cleaned.salaryText).toBe("15-20K");
    expect(cleaned.jdRaw).not.toContain("职位描述CSS");
    expect(cleaned.jdRaw).toContain("岗位职责");
    expect(cleaned.jdRaw).toContain("参与智慧城市");
    expect(cleaned.jdRaw).toContain("Web前端建设");
    expect(cleaned.jdRaw).toContain("任职要求");
    expect(cleaned.jdRaw).not.toContain("display:none");
    expect(cleaned.jdRaw).not.toContain("BOSS直聘");
    expect(cleaned.jdRaw).not.toContain("kanzhun");
    expect(cleaned.jdRaw).not.toContain("工作地址");
    expect(cleaned.jdRaw).not.toContain("热门职位");
  });
});
