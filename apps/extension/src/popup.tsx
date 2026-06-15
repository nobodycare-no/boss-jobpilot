import { useState } from "react";

import type { Application, JobPosting, JobPostingInput } from "@boss-jobpilot/shared";

import { findMatchingJob } from "./job-matching";

const apiBaseUrl = "http://127.0.0.1:4000";

type PopupState =
  | "idle"
  | "loading"
  | "ready"
  | "saved"
  | "duplicate"
  | "filled"
  | "copied"
  | "error";

type ContentResult<T> = {
  error?: string;
  ok?: boolean;
} & T;

type EmptyContentResult = {
  error?: string;
  ok?: boolean;
};

type JobListResponse = {
  items: JobPosting[];
};

type JobCreateResponse = {
  item: JobPosting;
};

type LatestApplicationResponse = {
  item: Application | null;
};

type ApplicationPackageResponse = {
  item: {
    generatedAt: string;
    jobId: string;
    markdownContent: string;
  };
};

type MatchedApplicationPackage = {
  application: Application;
  job: JobPosting;
};

type ActiveTab = {
  id: number;
  url?: string;
};

export default function Popup() {
  const [state, setState] = useState<PopupState>("idle");
  const [message, setMessage] = useState(
    "打开 Boss 岗位页后，可以保存岗位、读取本地打招呼语或复制投递包。"
  );
  const [matchedPackage, setMatchedPackage] = useState<MatchedApplicationPackage | null>(null);
  const [applicationPackage, setApplicationPackage] = useState<ApplicationPackageResponse["item"] | null>(
    null
  );

  async function captureCurrentJob() {
    setState("loading");
    setMessage("正在采集当前页面...");

    try {
      const tab = await getActiveTab();
      const currentJob = await extractCurrentJob(tab);
      const jobs = await fetchJson<JobListResponse>("/jobs");
      const matchedJob = findMatchingJob(currentJob, jobs.items);

      setMatchedPackage(null);
      setApplicationPackage(null);

      if (matchedJob) {
        setState("duplicate");
        setMessage(
          `岗位已在本地岗位池中，无需重复保存：${matchedJob.title} · ${
            matchedJob.companyName ?? "未填写公司"
          }`
        );
        return;
      }

      const response = await postJson<JobCreateResponse>("/jobs", currentJob);
      setState("saved");
      setMessage(
        `岗位已保存到本地岗位池：${response.item.title} · ${
          response.item.companyName ?? "未填写公司"
        }。回到 Web 工作台生成简历和打招呼语后，可以在这里读取。`
      );
    } catch (error) {
      showError(error, "岗位采集失败");
    }
  }

  async function loadGreetingDraft() {
    setState("loading");
    setMessage("正在匹配本地岗位和最新打招呼语...");

    try {
      const tab = await getActiveTab();
      const currentJob = await extractCurrentJob(tab);
      const jobs = await fetchJson<JobListResponse>("/jobs");
      const matchedJob = findMatchingJob(currentJob, jobs.items);

      if (!matchedJob) {
        throw new Error("本地岗位池还没有匹配当前页面的岗位，请先保存当前岗位。");
      }

      const latestApplication = await fetchJson<LatestApplicationResponse>(
        `/jobs/${matchedJob.id}/application/latest`
      );

      if (!latestApplication.item?.greetingMessage) {
        throw new Error("已找到本地岗位，但还没有生成打招呼语。请先在 Web 工作台生成。");
      }

      setMatchedPackage({
        application: latestApplication.item,
        job: matchedJob
      });
      setApplicationPackage(null);
      setState("ready");
      setMessage(`已找到：${matchedJob.title} · ${matchedJob.companyName ?? "未填写公司"}`);
    } catch (error) {
      setMatchedPackage(null);
      showError(error, "读取打招呼语失败");
    }
  }

  async function copyGreetingDraft() {
    if (!matchedPackage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(matchedPackage.application.greetingMessage);
      setState("copied");
      setMessage("打招呼语已复制。");
    } catch (error) {
      showError(error, "复制失败，请在 Web 工作台手动复制。");
    }
  }

  async function loadApplicationPackage() {
    setState("loading");
    setMessage("正在匹配本地岗位并生成投递包...");

    try {
      const tab = await getActiveTab();
      const currentJob = await extractCurrentJob(tab);
      const jobs = await fetchJson<JobListResponse>("/jobs");
      const matchedJob = findMatchingJob(currentJob, jobs.items);

      if (!matchedJob) {
        throw new Error("本地岗位池还没有匹配当前页面的岗位，请先保存当前岗位。");
      }

      const response = await fetchJson<ApplicationPackageResponse>(
        `/jobs/${matchedJob.id}/application-package`
      );

      setApplicationPackage(response.item);
      setState("ready");
      setMessage(`投递包已准备：${matchedJob.title} · ${matchedJob.companyName ?? "未填写公司"}`);
    } catch (error) {
      setApplicationPackage(null);
      showError(error, "读取投递包失败");
    }
  }

  async function copyApplicationPackage() {
    if (!applicationPackage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(applicationPackage.markdownContent);
      setState("copied");
      setMessage("投递包已复制。");
    } catch (error) {
      showError(error, "复制投递包失败，请回到 Web 工作台手动复制。");
    }
  }

  async function fillGreetingDraft() {
    if (!matchedPackage) {
      return;
    }

    setState("loading");
    setMessage("正在填入当前页面输入框...");

    try {
      const tab = await getActiveTab();
      const result = await fillGreetingOnPage(tab.id, matchedPackage.application.greetingMessage);

      if (!result.ok) {
        throw new Error(result.error ?? "填入失败");
      }

      setState("filled");
      setMessage("打招呼语已填入页面输入框，请检查内容后手动发送。");
    } catch (error) {
      showError(error, "填入失败，请复制后手动粘贴。");
    }
  }

  return (
    <main
      style={{
        minWidth: 340,
        padding: 16,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#172126"
      }}
    >
      <h1 style={{ margin: "0 0 8px", fontSize: 18 }}>boss-jobpilot</h1>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{message}</p>

      {matchedPackage ? (
        <section
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #d8e3e5",
            borderRadius: 6,
            background: "#f7faf9"
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>{matchedPackage.job.title}</strong>
          <p style={{ margin: 0, maxHeight: 96, overflow: "auto", lineHeight: 1.55 }}>
            {matchedPackage.application.greetingMessage}
          </p>
        </section>
      ) : null}

      {applicationPackage ? (
        <section
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #d8e3e5",
            borderRadius: 6,
            background: "#f7faf9"
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>投递包</strong>
          <p style={{ margin: "0 0 8px", color: "#5d6b70", fontSize: 12 }}>
            生成时间：{formatPackageTime(applicationPackage.generatedAt)}
          </p>
          <pre
            style={{
              margin: 0,
              maxHeight: 260,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
              fontSize: 12
            }}
          >
            {applicationPackage.markdownContent}
          </pre>
        </section>
      ) : null}

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => void captureCurrentJob()}
          disabled={state === "loading"}
          style={primaryButtonStyle}
        >
          {state === "loading" ? "处理中" : "保存当前岗位"}
        </button>
        <button
          type="button"
          onClick={() => void loadGreetingDraft()}
          disabled={state === "loading"}
          style={secondaryButtonStyle}
        >
          读取本地打招呼语
        </button>
        <button
          type="button"
          onClick={() => void loadApplicationPackage()}
          disabled={state === "loading"}
          style={secondaryButtonStyle}
        >
          读取本地投递包
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => void copyGreetingDraft()}
            disabled={!matchedPackage || state === "loading"}
            style={secondaryButtonStyle}
          >
            复制话术
          </button>
          <button
            type="button"
            onClick={() => void fillGreetingDraft()}
            disabled={!matchedPackage || state === "loading"}
            style={primaryButtonStyle}
          >
            填入页面
          </button>
        </div>
        <button
          type="button"
          onClick={() => void copyApplicationPackage()}
          disabled={!applicationPackage || state === "loading"}
          style={secondaryButtonStyle}
        >
          复制投递包
        </button>
      </div>
    </main>
  );

  function showError(error: unknown, fallback: string) {
    setState("error");
    setMessage(error instanceof Error ? error.message : fallback);
  }
}

const primaryButtonStyle = {
  width: "100%",
  height: 36,
  border: "1px solid #0f5d66",
  borderRadius: 6,
  color: "#fff",
  background: "#0f5d66",
  cursor: "pointer"
} satisfies React.CSSProperties;

const secondaryButtonStyle = {
  width: "100%",
  height: 36,
  border: "1px solid #b8c9cc",
  borderRadius: 6,
  color: "#172126",
  background: "#fff",
  cursor: "pointer"
} satisfies React.CSSProperties;

async function getActiveTab(): Promise<ActiveTab> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("没有找到当前标签页");
  }

  return {
    id: tab.id,
    url: tab.url
  };
}

async function extractCurrentJob(tab: ActiveTab) {
  ensureBossJobTab(tab.url);
  let result: ContentResult<{ job?: JobPostingInput }>;

  try {
    result = await sendTabMessage<ContentResult<{ job?: JobPostingInput }>>(tab.id, {
      type: "boss-jobpilot:extract-current-job"
    });
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw error;
    }

    result = await extractCurrentJobWithScripting(tab.id);
  }

  if (!result.ok || !result.job) {
    throw new Error(result.error ?? "当前页面不是可识别的 Boss 岗位页");
  }

  return result.job;
}

async function sendTabMessage<T>(tabId: number, message: Record<string, unknown>) {
  return (await chrome.tabs.sendMessage(tabId, message)) as T;
}

async function extractCurrentJobWithScripting(tabId: number) {
  const [injection] = await chrome.scripting.executeScript({
    func: extractBossJobPostingFallback,
    target: {
      tabId
    }
  });

  return injection?.result ?? { error: "当前页面无法读取岗位信息，请刷新 Boss 岗位页后重试。", ok: false };
}

async function fillGreetingOnPage(tabId: number, greetingMessage: string): Promise<EmptyContentResult> {
  try {
    return await sendTabMessage<EmptyContentResult>(tabId, {
      greetingMessage,
      type: "boss-jobpilot:fill-greeting"
    });
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw error;
    }

    const [injection] = await chrome.scripting.executeScript({
      args: [greetingMessage],
      func: fillGreetingFallback,
      target: {
        tabId
      }
    });

    return injection?.result ?? { error: "当前页面无法填入打招呼语，请复制后手动粘贴。", ok: false };
  }
}

function ensureBossJobTab(url?: string) {
  if (!url) {
    return;
  }

  try {
    const currentUrl = new URL(url);

    if (currentUrl.protocol === "https:" && /(^|\.)zhipin\.com$/i.test(currentUrl.hostname)) {
      return;
    }
  } catch {
    // Ignore invalid tab URLs and let the extraction path return the visible error.
  }

  throw new Error("请先打开 Boss 直聘岗位页，再使用插件保存或读取岗位。");
}

function isMissingContentScriptError(error: unknown) {
  return (
    error instanceof Error &&
    /receiving end does not exist|could not establish connection|message port closed/i.test(
      error.message
    )
  );
}

function extractBossJobPostingFallback(): ContentResult<{ job?: JobPostingInput }> {
  const textFrom = (selectors: string[]) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = cleanText(element?.textContent ?? "");

      if (text) {
        return text;
      }
    }

    return "";
  };

  const title =
    cleanTitle(
      textFrom([
        ".job-title",
        ".job-banner .name",
        ".job-primary .name",
        ".name",
        "[class*='job-title']"
      ]) || cleanTitle(document.title)
    ) || "未识别岗位";
  const salary = extractSalary(
    textFrom([".salary", ".job-banner .salary", ".job-primary .salary", "[class*='salary']"]),
    title
  );
  const companyName = cleanCompany(
    textFrom([".company-info .name", ".company-name", "[class*='company']"])
  );
  const city = cleanCity(
    textFrom([
      ".job-location",
      ".job-address",
      ".location-address",
      ".job-primary .job-area",
      ".job-banner .job-area",
      "[class*='address']"
    ])
  );
  const requirementText = textFrom([
    ".job-primary .tag-list",
    ".job-banner .tag-list",
    ".job-tags",
    ".job-sec-text",
    "[class*='tag-list']"
  ]);
  const jdRaw = extractDescription();

  return {
    job: {
      capturedAt: new Date().toISOString(),
      city,
      companyName,
      educationRequirement:
        requirementText.match(/博士|硕士|本科|大专|中专|高中|学历不限/)?.[0] ?? "",
      experienceRequirement:
        requirementText.match(/(?:\d+\s*-\s*\d+\s*年|\d+\s*年(?:以上|以内)?|经验不限|应届|在校)/)
          ?.[0] ?? "",
      id: crypto.randomUUID(),
      jdRaw,
      platform: "boss",
      salaryText: salary,
      title: salary ? title.replace(salary, "").trim() || title : title,
      url: location.href
    },
    ok: true
  };

  function extractDescription() {
    const root =
      document.querySelector(".job-detail") ??
      document.querySelector(".job-detail-section") ??
      document.querySelector(".detail-content") ??
      document.body;
    const clone = root.cloneNode(true) as Element;

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
          ".recommend-list",
          ".job-list",
          ".footer"
        ].join(",")
      )
      .forEach((node) => node.remove());

    return cleanDescription(clone.textContent ?? "");
  }

  function cleanDescription(value: string) {
    const lines = cleanText(value, true)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/BOSS直聘|boss直聘|kanzhun/i.test(line));
    const scoped = trimBefore(lines.join("\n"), ["岗位职责", "工作职责", "任职要求", "岗位要求"]);

    return trimAfter(scoped, [
      "工作地址",
      "去App与",
      "求职工具",
      "升级VIP",
      "热门职位",
      "热门城市",
      "热门企业",
      "查看更多信息"
    ]);
  }

  function cleanText(value: string, multiline = false) {
    const cleaned = decodeBossDigits(value)
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|p|li|section|article|h[1-6])>/gi, "\n")
      .replace(/<\/?(?:[a-z][\w:-]*)(?:\s[^>]*)?>/gi, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\u00a0/g, " ")
      .normalize("NFKC");
    const lines = cleaned
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    return multiline ? lines.join("\n").trim() : lines.join(" ").trim();
  }

  function decodeBossDigits(value: string) {
    const digitMap: Record<string, string> = {
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

    return value.replace(/[\ue000-\uf8ff]/g, (character) => digitMap[character] ?? "");
  }

  function extractSalary(...sources: string[]) {
    for (const source of sources) {
      const match = decodeBossDigits(source).match(
        /(?:\d+(?:\.\d+)?\s*[-~—]\s*\d+(?:\.\d+)?\s*[Kk万千元日天/月年]*|\d+\s*元\/天|\d+\s*[-~—]\s*\d+\s*元\/天)/
      );

      if (match?.[0]) {
        return match[0].replace(/\s+/g, "");
      }
    }

    return "";
  }

  function cleanTitle(value: string) {
    return value
      .replace(/[-_].*?BOSS直聘.*$/i, "")
      .replace(/[收藏立即沟通举报]+$/g, "")
      .trim();
  }

  function cleanCompany(value: string) {
    return value
      .replace(/·.*$/g, "")
      .replace(/在线|HR|招聘者|刚刚活跃|今日活跃/g, "")
      .trim();
  }

  function cleanCity(value: string) {
    const match = value
      .replace(/点击查看地图|查看地图|工作地址/g, " ")
      .match(/[\u4e00-\u9fa5]{2,}(?:·[\u4e00-\u9fa5]{2,}){0,2}/);

    return match?.[0] ?? "";
  }

  function trimBefore(value: string, keywords: string[]) {
    const firstIndex = keywords
      .map((keyword) => value.indexOf(keyword))
      .filter((index) => index >= 0)
      .sort((left, right) => left - right)[0];

    return firstIndex === undefined ? value.trim() : value.slice(firstIndex).trim();
  }

  function trimAfter(value: string, keywords: string[]) {
    const firstIndex = keywords
      .map((keyword) => value.indexOf(keyword))
      .filter((index) => index >= 0)
      .sort((left, right) => left - right)[0];

    return firstIndex === undefined ? value.trim() : value.slice(0, firstIndex).trim();
  }
}

function fillGreetingFallback(greetingMessage: string): EmptyContentResult {
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
  const input = selectors
    .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .find(isWritableElement);

  if (!input) {
    return {
      error: "没有找到可填写的聊天输入框，请手动复制后粘贴。",
      ok: false
    };
  }

  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    const descriptor = Object.getOwnPropertyDescriptor(
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value"
    );

    descriptor?.set?.call(input, greetingMessage);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus();

    return { ok: true };
  }

  const editableInput = input as HTMLElement;
  editableInput.textContent = greetingMessage;
  editableInput.dispatchEvent(new InputEvent("input", { bubbles: true, data: greetingMessage }));
  editableInput.dispatchEvent(new Event("change", { bubbles: true }));
  editableInput.focus();

  return { ok: true };

  function isWritableElement(element: Element) {
    if (
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLElement)
    ) {
      return false;
    }

    if (
      (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
      (element.disabled || element.readOnly)
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }
}

async function fetchJson<T>(path: string, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, init);
  } catch {
    throw new Error("本地 API 不可用，请先启动 boss-jobpilot。");
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, "本地 API 未完成请求，请确认 boss-jobpilot 已启动。"));
  }

  return (await response.json()) as T;
}

async function postJson<T>(path: string, payload: unknown) {
  return fetchJson<T>(path, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ? `${fallback}（${body.error}）` : fallback;
  } catch {
    return fallback;
  }
}

function formatPackageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
