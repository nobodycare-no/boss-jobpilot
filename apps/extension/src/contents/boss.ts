import type { PlasmoCSConfig } from "plasmo";

import { extractBossJobPosting } from "../extractors/boss";

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

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isCaptureMessage(message)) {
    return false;
  }

  void captureCurrentJob()
    .then((result) => sendResponse(result))
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "岗位采集失败"
      })
    );

  return true;
});

async function captureCurrentJob() {
  const job = extractBossJobPosting(document);
  const response = await fetch("http://127.0.0.1:4000/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(job)
  });

  if (!response.ok) {
    throw new Error("本地 API 未保存岗位");
  }

  return {
    ok: true,
    job
  };
}

function isCaptureMessage(
  message: unknown
): message is { type: "boss-jobpilot:capture-current-job" } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "boss-jobpilot:capture-current-job"
  );
}
