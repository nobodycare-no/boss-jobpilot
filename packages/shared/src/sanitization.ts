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
      .replace(mojibakeTokenPattern, " ")
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
  const cleanFields: Partial<JobTextFields> = {
    city: cleanOptionalText(input.city),
    companyName: cleanOptionalText(input.companyName),
    educationRequirement: cleanOptionalText(input.educationRequirement),
    experienceRequirement: cleanOptionalText(input.experienceRequirement),
    jdRaw: cleanText(input.jdRaw, { multiline: true }),
    platform: cleanText(input.platform),
    salaryText: cleanOptionalText(input.salaryText),
    title: cleanText(input.title),
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
