import type { JobPostingCreateInput, JobPostingInput, JobPostingUpdateInput } from "./types";

type JobTextFields = Pick<
  JobPostingCreateInput,
  | "city"
  | "companyName"
  | "educationRequirement"
  | "experienceRequirement"
  | "jdRaw"
  | "platform"
  | "salaryText"
  | "title"
  | "url"
>;

const htmlBlockPattern = /<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi;
const htmlTagPattern = /<\/?(?:[a-z][\w:-]*)(?:\s[^>]*)?>/gi;
const controlCharacterPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const replacementCharacterPattern = /[\ufffd�]/g;
const mojibakeCharacterPattern = /[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-ÿ]/g;
const mojibakeTokenPattern =
  /\S*[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-ÿ]\S*[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-ÿ]\S*[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-ÿ]\S*/g;
const cssNoisePattern = /[.#][A-Za-z0-9_-]+\s*\{[^}]*\}/g;
const bossNoisePattern = /来自BOSS直聘|BOSS直聘|boss直聘|kanzhun|直聘/gi;
const bossPrivateUseDigitMap: Record<string, string> = {
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
const bossPrivateUsePattern = /[\ue030-\ue039\ue0b0-\ue0b9]/g;
const salaryPattern =
  /(?:\d+(?:\.\d+)?\s*[-~—]\s*\d+(?:\.\d+)?\s*(?:K|k|万|千|元\/天|元\/月|元\/年)(?:·\d+薪)?|\d+\s*元\/天)/;

const htmlEntities: Record<string, string> = {
  amp: "&",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  apos: "'"
};

export function cleanText(value: string | null | undefined, options: { multiline?: boolean } = {}) {
  if (!value) {
    return "";
  }

  const withoutHtml = decodeHtmlEntities(
    value
      .replace(htmlBlockPattern, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|p|li|section|article|h[1-6])>/gi, "\n")
      .replace(htmlTagPattern, " ")
      .replace(cssNoisePattern, "\n")
      .replace(mojibakeTokenPattern, " ")
      .replace(bossPrivateUsePattern, (character) => bossPrivateUseDigitMap[character] ?? "")
  )
    .replace(controlCharacterPattern, " ")
    .replace(/\u00a0/g, " ")
    .normalize("NFKC");

  const lines = withoutHtml
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line && !isLikelyGarbled(line));

  if (options.multiline) {
    return lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

export function cleanJobPostingInput<T extends JobPostingCreateInput | JobPostingInput>(
  input: T
): T {
  const salaryText = cleanOptionalText(input.salaryText);
  const title = cleanText(input.title);
  const cleanFields: Partial<JobTextFields> = {
    city: cleanOptionalText(input.city),
    companyName: cleanOptionalText(input.companyName),
    educationRequirement: cleanOptionalText(input.educationRequirement),
    experienceRequirement: cleanOptionalText(input.experienceRequirement),
    jdRaw: cleanJobDescriptionText(input.jdRaw),
    platform: cleanText(input.platform),
    salaryText: cleanSalaryText(salaryText),
    title: removeSalaryFromTitle(title, salaryText),
    url: cleanOptionalText(input.url)
  };

  return {
    ...input,
    ...cleanFields
  };
}

export function cleanJobPostingUpdateInput(input: JobPostingUpdateInput): JobPostingUpdateInput {
  const next = { ...input };

  if ("city" in next) {
    next.city = cleanOptionalText(next.city);
  }
  if ("companyName" in next) {
    next.companyName = cleanOptionalText(next.companyName);
  }
  if ("educationRequirement" in next) {
    next.educationRequirement = cleanOptionalText(next.educationRequirement);
  }
  if ("experienceRequirement" in next) {
    next.experienceRequirement = cleanOptionalText(next.experienceRequirement);
  }
  if ("jdRaw" in next) {
    next.jdRaw = cleanText(next.jdRaw, { multiline: true });
  }
  if ("platform" in next) {
    next.platform = cleanText(next.platform);
  }
  if ("salaryText" in next) {
    next.salaryText = cleanOptionalText(next.salaryText);
  }
  if ("title" in next) {
    next.title = cleanText(next.title);
  }
  if ("url" in next) {
    next.url = cleanOptionalText(next.url);
  }

  return next;
}

function cleanOptionalText(value: string | null | undefined) {
  const cleaned = cleanText(value);

  return cleaned || undefined;
}

function cleanJobDescriptionText(value: string | null | undefined) {
  const cleaned = cleanText(value, { multiline: true })
    .replace(bossNoisePattern, "")
    .replace(/boss/gi, "");
  const trimmedStart = trimBeforeJobDescription(cleaned);
  const trimmedEnd = trimAfterJobDescription(trimmedStart)
    .split(/\r?\n/)
    .filter((line) => !/在线|HR|招聘者|刚刚活跃|今日活跃/.test(line))
    .join("\n");

  return trimmedEnd;
}

function cleanSalaryText(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const match = value.match(salaryPattern);

  return match?.[0]?.replace(/\s+/g, "") || value;
}

function removeSalaryFromTitle(title: string, salaryText: string | undefined) {
  const cleanedSalary = cleanSalaryText(salaryText);

  if (!cleanedSalary) {
    return title;
  }

  return title.replace(cleanedSalary, "").trim();
}

function trimBeforeJobDescription(value: string) {
  const strongStart = ["岗位职责", "工作职责", "任职要求", "岗位要求"]
    .map((keyword) => value.indexOf(keyword))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (strongStart !== undefined) {
    return value.slice(strongStart).trim();
  }

  const candidates = ["职位描述"];
  const firstIndex = candidates
    .map((keyword) => value.indexOf(keyword))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (firstIndex === undefined) {
    return value;
  }

  const prefix = value.slice(0, firstIndex);

  if (prefix.length < 40 && !salaryPattern.test(prefix) && !/收藏|立即沟通|举报|扫码/.test(prefix)) {
    return value;
  }

  return value.slice(firstIndex).trim();
}

function trimAfterJobDescription(value: string) {
  const firstIndex = [
    "工作地址",
    "去App与",
    "求职工具",
    "升级VIP",
    "热门职位",
    "热门城市",
    "热门企业",
    "附近城市",
    "查看更多信息"
  ]
    .map((keyword) => value.indexOf(keyword))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  return firstIndex === undefined ? value : value.slice(0, firstIndex).trim();
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();

    if (key.startsWith("#x")) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (key.startsWith("#")) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return htmlEntities[key] ?? match;
  });
}

function isLikelyGarbled(line: string) {
  const replacementCharacters = line.match(replacementCharacterPattern)?.length ?? 0;

  if (replacementCharacters > 0) {
    return replacementCharacters / line.length > 0.02 || replacementCharacters >= 2;
  }

  const mojibakeCharacters = line.match(mojibakeCharacterPattern)?.length ?? 0;

  return mojibakeCharacters >= 3 && mojibakeCharacters / line.length > 0.12;
}
