import { useState } from "react";

import type { Application, JobPosting, JobPostingInput } from "@boss-jobpilot/shared";

const apiBaseUrl = "http://127.0.0.1:4000";

type PopupState = "idle" | "loading" | "ready" | "saved" | "filled" | "copied" | "error";

type ContentResult<T> = {
  error?: string;
  ok?: boolean;
} & T;

type JobListResponse = {
  items: JobPosting[];
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

export default function Popup() {
  const [state, setState] = useState<PopupState>("idle");
  const [message, setMessage] = useState("打开 Boss 岗位页后，可保存岗位或读取本地打招呼语。");
  const [matchedPackage, setMatchedPackage] = useState<MatchedApplicationPackage | null>(null);
  const [applicationPackage, setApplicationPackage] = useState<ApplicationPackageResponse["item"] | null>(
    null
  );

  async function captureCurrentJob() {
    setState("loading");
    setMessage("正在采集当前页面...");

    try {
      const tabId = await getActiveTabId();
      const result = await sendTabMessage<ContentResult<{ job?: JobPostingInput }>>(tabId, {
        type: "boss-jobpilot:capture-current-job"
      });

      if (!result.ok) {
        throw new Error(result.error ?? "岗位保存失败");
      }

      setMatchedPackage(null);
      setApplicationPackage(null);
      setState("saved");
      setMessage("岗位已保存到本地岗位池。回到 Web 工作台生成简历和打招呼语后，可在这里读取。");
    } catch (error) {
      showError(error, "岗位采集失败");
    }
  }

  async function loadGreetingDraft() {
    setState("loading");
    setMessage("正在匹配本地岗位和最新打招呼语...");

    try {
      const tabId = await getActiveTabId();
      const currentJob = await extractCurrentJob(tabId);
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
      showError(error, "复制失败，请在 Web 工作台手动复制");
    }
  }

  async function loadApplicationPackage() {
    setState("loading");
    setMessage("正在匹配本地岗位并生成投递包...");

    try {
      const tabId = await getActiveTabId();
      const currentJob = await extractCurrentJob(tabId);
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
      const tabId = await getActiveTabId();
      const result = await sendTabMessage<ContentResult<Record<string, never>>>(tabId, {
        greetingMessage: matchedPackage.application.greetingMessage,
        type: "boss-jobpilot:fill-greeting"
      });

      if (!result.ok) {
        throw new Error(result.error ?? "填入失败");
      }

      setState("filled");
      setMessage("打招呼语已填入页面输入框，请检查内容后手动发送。");
    } catch (error) {
      showError(error, "填入失败，请复制后手动粘贴");
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
          <p style={{ margin: 0, maxHeight: 96, overflow: "auto", lineHeight: 1.55 }}>
            {applicationPackage.markdownContent.slice(0, 240)}
            {applicationPackage.markdownContent.length > 240 ? "..." : ""}
          </p>
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

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("没有找到当前标签页");
  }

  return tab.id;
}

async function extractCurrentJob(tabId: number) {
  const result = await sendTabMessage<ContentResult<{ job?: JobPostingInput }>>(tabId, {
    type: "boss-jobpilot:extract-current-job"
  });

  if (!result.ok || !result.job) {
    throw new Error(result.error ?? "当前页面不是可识别的 Boss 岗位页");
  }

  return result.job;
}

async function sendTabMessage<T>(tabId: number, message: Record<string, unknown>) {
  return (await chrome.tabs.sendMessage(tabId, message)) as T;
}

async function fetchJson<T>(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error("本地 API 不可用，请先启动 boss-jobpilot。");
  }

  return (await response.json()) as T;
}

function findMatchingJob(currentJob: JobPostingInput, jobs: JobPosting[]) {
  const currentUrl = normalizeUrl(currentJob.url);
  const currentTitle = normalizeText(currentJob.title);
  const currentCompany = normalizeText(currentJob.companyName);

  return (
    jobs.find((job) => normalizeUrl(job.url) === currentUrl) ??
    jobs.find(
      (job) =>
        normalizeText(job.title) === currentTitle &&
        (!currentCompany || normalizeText(job.companyName) === currentCompany)
    )
  );
}

function normalizeUrl(value?: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return value.trim();
  }
}

function normalizeText(value?: string) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}
