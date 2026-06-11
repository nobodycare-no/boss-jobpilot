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
    void waitForJobDetail()
      .then(() =>
        sendResponse({
          job: extractBossJobPosting(document),
          ok: true
        })
      )
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "岗位信息尚未渲染完成"
        })
      );
    return true;
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
  await waitForJobDetail();
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

async function waitForJobDetail(timeoutMs = 6000) {
  const startedAt = Date.now();
  let lastSignature = "";
  let stableCount = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const signature = [
      document.querySelector(".job-title, .job-banner .name, .job-primary .name")?.textContent,
      document.querySelector(".salary, .job-banner .salary, .job-primary .salary")?.textContent,
      document.querySelector(".job-sec-text, .job-detail-section .text, .job-description")
        ?.textContent
    ]
      .filter(Boolean)
      .join("\n")
      .replace(/\s+/g, " ")
      .trim();

    if (signature.length >= 30 && signature === lastSignature) {
      stableCount += 1;

      if (stableCount >= 2) {
        return;
      }
    } else {
      stableCount = 0;
      lastSignature = signature;
    }

    await delay(250);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
