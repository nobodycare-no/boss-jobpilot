import type { PlasmoCSConfig } from "plasmo";

import { extractBossJobPosting } from "../src/extractors/boss";

export const config: PlasmoCSConfig = {
  matches: ["https://www.zhipin.com/*"],
  run_at: "document_idle"
};

const posting = extractBossJobPosting(document);

window.dispatchEvent(
  new CustomEvent("boss-jobpilot:job-detected", {
    detail: posting
  })
);
