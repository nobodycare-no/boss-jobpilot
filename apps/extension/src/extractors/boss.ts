import { type JobPostingInput } from "@boss-jobpilot/shared";

function textFrom(document: Document, selectors: string[]) {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.textContent?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

export function extractBossJobPosting(document: Document): JobPostingInput {
  const title =
    textFrom(document, [".job-title", ".name", "[class*='job-title']"]) || document.title;
  const salary = textFrom(document, [".salary", "[class*='salary']"]);
  const companyName = textFrom(document, [
    ".company-info .name",
    ".company-name",
    "[class*='company']"
  ]);
  const jdRaw = textFrom(document, [".job-sec-text", ".job-detail", "[class*='job-detail']"]);

  return {
    id: crypto.randomUUID(),
    platform: "boss",
    url: location.href,
    title,
    salaryText: salary,
    city: "",
    experienceRequirement: "",
    educationRequirement: "",
    jdRaw,
    companyName,
    capturedAt: new Date().toISOString()
  };
}
