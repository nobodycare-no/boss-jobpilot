import { describe, expect, it } from "vitest";

import {
  decodeBossProtectedText,
  extractBossSalary,
  normalizeBossDescription
} from "./boss";

describe("Boss extractor sanitization", () => {
  it("decodes Boss private-use salary digits", () => {
    expect(decodeBossProtectedText("前端开发(React+双休大厂全额公积金)\ue0b2\ue0b6-\ue0b3\ue0b1K")).toBe(
      "前端开发(React+双休大厂全额公积金)15-20K"
    );
    expect(decodeBossProtectedText("前端开发(React+双休大厂全额公积金)\ue032\ue036-\ue033\ue031K")).toBe(
      "前端开发(React+双休大厂全额公积金)15-20K"
    );
    expect(extractBossSalary("\ue0b2\ue0b6-\ue0b3\ue0b1K")).toBe("15-20K");
    expect(extractBossSalary("\ue032\ue036-\ue033\ue031K")).toBe("15-20K");
    expect(extractBossSalary("\ue0b2\ue0b6\ue0b1-\ue0b3\ue0b1\ue0b1元/天")).toBe("150-200元/天");
  });

  it("removes style, watermark and page chrome noise from job descriptions", () => {
    const description = normalizeBossDescription(
      [
        "职位描述CSS不接受居家办公HTML5JavaScriptVueReact",
        ".CsCNszmdwSA{display:none!important;}",
        ".XkQXGiaHHr{display:inline-block;font-size:0!important;width:1em;height:1em;visibility:hidden;line-height:0;}",
        "岗位职直聘责:",
        "1.3D可视来自BOSS直聘化开发: 参与智慧kanzhun城市、智慧BOSS直聘园区项目的Web前boss端建设。",
        "任职要求:",
        "1.学历专业: 27届本科及以上学历在读,计算机、软件工程等相关专业。",
        "孟凡霞 在线 飞渡科技股份有限公司 · HR 去App与BOSS随时沟通",
        "工作地址深圳南山区深圳国家工程实验室大楼-A栋",
        "热门职位 热门城市 热门企业 附近城市 深圳硬件测试招聘"
      ].join("\n")
    );

    expect(description).toContain("岗位职责");
    expect(description).toContain("参与智慧城市");
    expect(description).toContain("Web前端建设");
    expect(description).toContain("任职要求");
    expect(description).not.toContain("职位描述CSS");
    expect(description).not.toContain("display:none");
    expect(description).not.toContain("BOSS直聘");
    expect(description).not.toContain("直聘");
    expect(description).not.toContain("前boss端");
    expect(description).not.toContain("kanzhun");
    expect(description).not.toContain("工作地址");
    expect(description).not.toContain("热门职位");
    expect(description).not.toContain("HR");
  });
});
