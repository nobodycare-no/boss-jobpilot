import { Bot, BriefcaseBusiness, ClipboardList, LibraryBig, Radar } from "lucide-react";

const modules = [
  {
    title: "经历库",
    description: "沉淀项目、实习、技能证据和可讲细节。",
    icon: LibraryBig,
    status: "Next"
  },
  {
    title: "岗位池",
    description: "保存 Boss 岗位、公司信息、JD 和投递状态。",
    icon: BriefcaseBusiness,
    status: "Planned"
  },
  {
    title: "AI 匹配",
    description: "解析岗位要求，匹配真实经历并生成投递策略。",
    icon: Bot,
    status: "Planned"
  },
  {
    title: "投递看板",
    description: "追踪打招呼、投递、回复、面试和跟进提醒。",
    icon: ClipboardList,
    status: "Planned"
  }
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            <Radar size={16} />
            AI 求职代理
          </p>
          <h1>boss-jobpilot</h1>
          <p className="hero-copy">
            本地优先的求职工作台，用结构化经历库匹配岗位 JD 和公司要求，生成精准投递包。
          </p>
        </div>
        <div className="status-panel" aria-label="当前里程碑">
          <span>Milestone 0</span>
          <strong>工程脚手架</strong>
          <small>Web + API + Extension + Shared Packages</small>
        </div>
      </section>

      <section className="module-grid" aria-label="功能模块">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <article className="module-card" key={module.title}>
              <div className="module-card__icon">
                <Icon size={20} />
              </div>
              <div>
                <div className="module-card__header">
                  <h2>{module.title}</h2>
                  <span>{module.status}</span>
                </div>
                <p>{module.description}</p>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
