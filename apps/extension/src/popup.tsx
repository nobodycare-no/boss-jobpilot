import { useState } from "react";

type CaptureState = "idle" | "saving" | "saved" | "error";

type CaptureResult = {
  ok?: boolean;
  error?: string;
};

export default function Popup() {
  const [state, setState] = useState<CaptureState>("idle");
  const [message, setMessage] = useState("打开 Boss 岗位页后，可一键保存到本地岗位池。");

  async function captureCurrentJob() {
    setState("saving");
    setMessage("正在采集当前页面...");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab?.id) {
        throw new Error("没有找到当前标签页");
      }

      const result = (await chrome.tabs.sendMessage(tab.id, {
        type: "boss-jobpilot:capture-current-job"
      })) as CaptureResult;

      if (!result.ok) {
        throw new Error(result.error ?? "岗位保存失败");
      }

      setState("saved");
      setMessage("岗位已保存到本地岗位池。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "岗位采集失败");
    }
  }

  return (
    <main
      style={{
        minWidth: 320,
        padding: 16,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#172126"
      }}
    >
      <h1 style={{ margin: "0 0 8px", fontSize: 18 }}>boss-jobpilot</h1>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{message}</p>
      <button
        type="button"
        onClick={() => void captureCurrentJob()}
        disabled={state === "saving"}
        style={{
          width: "100%",
          height: 36,
          marginTop: 14,
          border: "1px solid #0f5d66",
          borderRadius: 6,
          color: "#fff",
          background: state === "error" ? "#a94b35" : "#0f5d66",
          cursor: state === "saving" ? "wait" : "pointer"
        }}
      >
        {state === "saving" ? "保存中" : "保存当前岗位"}
      </button>
    </main>
  );
}
