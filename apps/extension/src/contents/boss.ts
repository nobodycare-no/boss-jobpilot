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

function fillGreetingDraft(document: Document, greetingMessage: string) {
  const element = findGreetingInput(document);

  if (!element) {
    return {
      ok: false,
      error: "没有找到可填写的聊天输入框，请手动复制后粘贴。"
    };
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    setNativeValue(element, greetingMessage);
    element.focus();
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  }

  element.textContent = greetingMessage;
  element.dispatchEvent(new InputEvent("input", { bubbles: true, data: greetingMessage }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  (element as HTMLElement).focus();

  return { ok: true };
}

function findGreetingInput(document: Document) {
  const selectors = [
    "[class*='chat'] textarea",
    "[class*='input'] textarea",
    "[class*='message'] textarea",
    "[class*='editor'] [contenteditable='true']",
    "[class*='dialog'] [contenteditable='true']",
    "[class*='chat'] [contenteditable='true']",
    "[class*='message'] [contenteditable='true']",
    "[role='textbox']",
    "textarea",
    "[contenteditable='true']",
    "input[type='text']"
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector)).filter(isVisibleEditable);

    if (elements.length > 0) {
      return elements[0];
    }
  }

  return null;
}

function isVisibleEditable(element: Element) {
  if (
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLElement)
  ) {
    return false;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
  );
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  valueSetter?.call(element, value);
}
