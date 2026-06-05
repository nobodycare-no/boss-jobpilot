export default function Popup() {
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
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        插件骨架已就绪。下一步会在 Boss 页面采集岗位信息并发送到本地 API。
      </p>
    </main>
  );
}
