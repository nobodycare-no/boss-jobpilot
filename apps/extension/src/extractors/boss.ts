import { cleanJobPostingInput, cleanText, type JobPostingInput } from "@boss-jobpilot/shared";

function textFrom(root: ParentNode, selectors: string[], options: { multiline?: boolean } = {}) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    const value = cleanText(element?.textContent, options);

    if (value) {
      return value;
    }
  }

  return "";
}

export function extractBossJobPosting(document: Document): JobPostingInput {
  const detailRoot =
    document.querySelector(".job-detail, .job-detail-box, .job-detail-container") ?? document;
  const title =
    textFrom(document, [".job-title", ".name", "[class*='job-title']"]) || document.title;
  const salary = textFrom(document, [".salary", "[class*='salary']"]);
  const companyName = textFrom(document, [
    ".company-info .name",
    ".company-name",
    "[class*='company']"
  ]);
  const jdRaw = textFrom(
    detailRoot,
    [
      ".job-sec-text",
      ".job-detail-section .text",
      ".job-detail .text",
      ".job-description",
      "[class*='job-sec']",
      "[class*='job-detail']"
    ],
    { multiline: true }
  );

  return cleanJobPostingInput({
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
  });
}
