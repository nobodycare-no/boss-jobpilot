import { cleanJobPostingInput, cleanText, type JobPostingInput } from "@boss-jobpilot/shared";

type TextOptions = {
  multiline?: boolean;
};

const detailRootSelectors = [
  ".job-detail-box",
  ".job-detail",
  ".job-detail-container",
  ".job-detail-content",
  ".detail-content",
  ".job-primary.detail-box",
  ".job-primary"
];

const titleSelectors = [
  ".job-detail-info .job-name",
  ".job-detail-box .job-title",
  ".job-detail .job-title",
  ".job-banner .name",
  ".job-primary .name",
  ".info-primary .name",
  "h1"
];

const salarySelectors = [
  ".job-detail-info .job-salary",
  ".job-detail-box .salary",
  ".job-detail .salary",
  ".job-title .job-salary",
  ".job-banner .salary",
  ".job-primary .salary",
  ".info-primary .salary"
];

const companySelectors = [
  ".job-detail-box .company-name",
  ".job-detail .company-name",
  ".job-banner .company-name",
  ".sider-company .company-info .name",
  ".company-info .company-name"
];

const citySelectors = [
  ".job-detail-box .location-address",
  ".job-detail .location-address",
  ".job-banner .job-location",
  ".job-primary .job-area",
  ".info-primary .job-area"
];

const requirementSelectors = [
  ".job-detail-box .tag-list",
  ".job-detail .tag-list",
  ".job-banner .job-tags",
  ".job-primary .tag-list",
  ".info-primary .tag-list"
];

const jdSelectors = [
  ".job-sec-text",
  ".job-detail-section .text",
  ".job-detail-section",
  ".job-description",
  ".job-detail .text"
];

const bossDigitMap: Record<string, string> = {
  "\ue031": "0",
  "\ue032": "1",
  "\ue033": "2",
  "\ue034": "3",
  "\ue035": "4",
  "\ue036": "5",
  "\ue037": "6",
  "\ue038": "7",
  "\ue039": "8",
  "\ue030": "9",
  "\ue0b1": "0",
  "\ue0b2": "1",
  "\ue0b3": "2",
  "\ue0b4": "3",
  "\ue0b5": "4",
  "\ue0b6": "5",
  "\ue0b7": "6",
  "\ue0b8": "7",
  "\ue0b9": "8",
  "\ue0b0": "9"
};

const privateUsePattern = /[\ue000-\uf8ff]/g;
const cssNoisePattern = /[.#][A-Za-z0-9_-]+\s*\{[^}]*\}/g;
const bossNoisePattern = /来自BOSS直聘|BOSS直聘|boss直聘|kanzhun/gi;
const salaryPattern =
  /(?:\d+(?:\.\d+)?\s*[-~—]\s*\d+(?:\.\d+)?\s*[Kk万千元日天/月年]*|\d+\s*元\/天|\d+\s*[-~—]\s*\d+\s*元\/天)/;

function textFrom(root: ParentNode, selectors: string[], options: TextOptions = {}) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    const value = visibleText(element, options);

    if (value) {
      return value;
    }
  }

  return "";
}

export function extractBossJobPosting(document: Document): JobPostingInput {
  const detailRoot = findDetailRoot(document);
  const pageTitle = stripBossTitle(document.title);
  const title = normalizeTitle(textFrom(document, titleSelectors) || pageTitle);
  const salary = extractBossSalary(textFrom(document, salarySelectors), title);
  const companyName = normalizeCompanyName(textFrom(document, companySelectors));
  const city = normalizeCity(textFrom(document, citySelectors));
  const requirements = extractRequirements(textFrom(document, requirementSelectors));
  const jdRaw = extractDescription(detailRoot);

  return cleanJobPostingInput({
    id: crypto.randomUUID(),
    platform: "boss",
    url: location.href,
    title,
    salaryText: salary,
    city,
    experienceRequirement: requirements.experienceRequirement,
    educationRequirement: requirements.educationRequirement,
    jdRaw,
    companyName,
    capturedAt: new Date().toISOString()
  });
}

function findDetailRoot(document: Document) {
  for (const selector of detailRootSelectors) {
    const element = document.querySelector(selector);

    if (element && visibleText(element, { multiline: true }).length > 20) {
      return element;
    }
  }

  return document;
}

function extractDescription(root: ParentNode) {
  const directText = textFrom(root, jdSelectors, { multiline: true });
  const cleaned = normalizeBossDescription(directText);

  if (cleaned) {
    return cleaned;
  }

  if (root instanceof Element) {
    return normalizeBossDescription(visibleText(root, { multiline: true }));
  }

  return normalizeBossDescription(visibleText(root.ownerDocument?.body, { multiline: true }));
}

function visibleText(element: Element | null | undefined, options: TextOptions = {}) {
  if (!element || !isVisible(element)) {
    return "";
  }

  const clone = element.cloneNode(true) as Element;
  clone
    .querySelectorAll(
      [
        "script",
        "style",
        "noscript",
        "svg",
        ".job-op",
        ".job-action",
        ".btn-container",
        ".promotion",
        ".links",
        ".recommend-list",
        ".job-list",
        ".job-list-box",
        ".search-job-result",
        ".footer"
      ].join(",")
    )
    .forEach((node) => node.remove());

  return cleanText(decodeBossProtectedText(clone.textContent ?? ""), options);
}

export function decodeBossProtectedText(value: string) {
  return value.replace(privateUsePattern, (character) => bossDigitMap[character] ?? "");
}

function normalizeTitle(value: string) {
  return removeSalary(value).replace(/[收藏立即沟通举报]+$/g, "").trim();
}

function normalizeCompanyName(value: string) {
  return value
    .replace(/·.*$/g, "")
    .replace(/在线|HR|招聘者|刚刚活跃|今日活跃/g, "")
    .trim();
}

function normalizeCity(value: string) {
  const cleaned = value
    .replace(/点击查看地图|查看地图|工作地址/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match = cleaned.match(/[\u4e00-\u9fa5]{2,}(?:·[\u4e00-\u9fa5]{2,}){0,2}/);

  return match?.[0] ?? "";
}

function extractRequirements(value: string) {
  const parts = value.split(/\s+/).filter(Boolean);
  const experienceRequirement = parts.find((part) => /经验|年|应届|在校|不限/.test(part)) ?? "";
  const educationRequirement = parts.find((part) =>
    /博士|硕士|本科|大专|中专|高中|学历不限/.test(part)
  );

  return {
    educationRequirement: educationRequirement ?? "",
    experienceRequirement
  };
}

export function extractBossSalary(...sources: string[]) {
  for (const source of sources) {
    const decoded = decodeBossProtectedText(source);
    const match = decoded.match(salaryPattern);

    if (match?.[0]) {
      return match[0].replace(/\s+/g, "");
    }
  }

  return "";
}

function removeSalary(value: string) {
  const salary = extractBossSalary(value);

  return salary ? value.replace(salary, " ") : value;
}

export function normalizeBossDescription(value: string) {
  const cleaned = decodeBossProtectedText(value)
    .replace(cssNoisePattern, "\n")
    .replace(bossNoisePattern, "")
    .replace(/直聘/g, "")
    .replace(/boss/gi, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(isUsefulDescriptionLine)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return trimAfterDescriptionEnd(cleaned);
}

function trimAfterDescriptionEnd(value: string) {
  const strongStart = ["岗位职责", "工作职责", "任职要求", "岗位要求"]
    .map((keyword) => value.indexOf(keyword))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const scopedValue = strongStart === undefined ? value : value.slice(strongStart).trim();
  const noiseIndex = [
    "工作地址",
    "去App与",
    "求职工具",
    "升级VIP",
    "热门职位",
    "热门城市",
    "热门企业",
    "查看更多信息"
  ]
    .map((keyword) => scopedValue.indexOf(keyword))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  return noiseIndex === undefined ? scopedValue : scopedValue.slice(0, noiseIndex).trim();
}

function isUsefulDescriptionLine(line: string) {
  if (!line) {
    return false;
  }

  if (privateUsePattern.test(line) || cssNoisePattern.test(line)) {
    return false;
  }

  if (/display\s*:|font-size\s*:|visibility\s*:|!important|\{|\}/i.test(line)) {
    return false;
  }

  if (/收藏|立即沟通|举报|微信扫码分享|扫码|前往App|点击查看地图/.test(line)) {
    return false;
  }

  if (/在线|HR|招聘者|刚刚活跃|今日活跃/.test(line)) {
    return false;
  }

  if (/热门职位|热门城市|热门企业|附近城市|招聘$/.test(line)) {
    return false;
  }

  return true;
}

function stripBossTitle(value: string) {
  return value.replace(/招聘.*$/, "").replace(/[-_]?BOSS直聘.*$/i, "").trim();
}

function isVisible(element: Element) {
  const htmlElement = element as HTMLElement;
  const style = window.getComputedStyle(htmlElement);

  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  return true;
}
