import type { PlasmoCSConfig } from "plasmo";
import type { JobPosting } from "@boss-jobpilot/shared";

import { extractBossJobPosting } from "../extractors/boss";
import { fillGreetingDraft } from "../fill-greeting";
import { findMatchingJob } from "../job-matching";

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
  if (isExtractMessage(message)) {
    sendResponse({
      job: extractBossJobPosting(document),
      ok: true
    });
    return false;
  }

  if (isFillGreetingMessage(message)) {
    sendResponse(fillGreetingDraft(document, message.greetingMessage));
    return false;
  }

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
  const jobsResponse = await fetch("http://127.0.0.1:4000/jobs");

  if (!jobsResponse.ok) {
    throw new Error("本地 API 不可用，请先启动 boss-jobpilot。");
  }

  const jobs = (await jobsResponse.json()) as { items: JobPosting[] };
  const matchedJob = findMatchingJob(job, jobs.items);

  if (matchedJob) {
    return {
      duplicate: true,
      job,
      matchedJob,
      ok: true
    };
  }

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
    duplicate: false,
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

function isExtractMessage(
  message: unknown
): message is { type: "boss-jobpilot:extract-current-job" } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "boss-jobpilot:extract-current-job"
  );
}

function isFillGreetingMessage(
  message: unknown
): message is { greetingMessage: string; type: "boss-jobpilot:fill-greeting" } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    "greetingMessage" in message &&
    message.type === "boss-jobpilot:fill-greeting" &&
    typeof message.greetingMessage === "string"
  );
}
