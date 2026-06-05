# boss-jobpilot

`boss-jobpilot` 是一个本地优先的 AI 求职代理，目标是尽量自动化求职投递中的重复劳动：岗位采集、公司分析、匹配评分、个性化打招呼语、定制简历、投递记录、跟进提醒和面试准备。

项目原则：

- 自动完成信息收集、分析、生成和记录。
- 对高价值或高风险动作保留人工确认。
- 使用真实经历库生成简历，强化表达但不编造经历。
- 数据默认保存在本地，简历和求职记录不上传到自有服务器。

## Recommended Repo Name

实际仓库名：`boss-jobpilot`

备选名称：

- `jobpilot-ai`
- `career-agent-ai`
- `resume-copilot`
- `hireflow-ai`

## Documentation

- [项目概要](docs/00-project-brief.md)
- [技术栈](docs/01-tech-stack.md)
- [系统架构](docs/02-system-architecture.md)
- [产品需求](docs/03-product-requirements.md)
- [数据模型](docs/04-data-model.md)
- [AI Agent 设计](docs/05-ai-agent-design.md)
- [安全与合规](docs/06-security-compliance.md)
- [迭代计划](docs/07-iteration-plan.md)
- [进度追踪计划](docs/08-progress-tracking.md)
- [Git 工作流](docs/09-git-workflow.md)
- [Codex 开发说明](docs/10-dev-notes-for-codex.md)

## Target MVP

第一版目标：

1. 建立个人经历库。
2. 从 Boss 直聘页面采集岗位和公司信息。
3. AI 分析 JD、公司要求和岗位风险。
4. 根据经历库生成岗位定制简历和打招呼语。
5. 管理投递状态、跟进记录和面试准备材料。

## Development

本项目使用 pnpm workspace。若本机没有直接安装 pnpm，可通过 Corepack 调用：

```powershell
corepack pnpm install
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```

当前 workspace：

- `apps/web`：本地求职工作台。
- `apps/api`：本地 Fastify API。
- `apps/extension`：Chrome 插件骨架。
- `packages/shared`：共享 Zod schema 和类型。
- `packages/db`：Drizzle SQLite schema。
- `packages/ai`：AI Provider 和 Prompt 版本骨架。
- `packages/resume`：简历 Markdown 生成逻辑。
- `packages/scoring`：岗位匹配评分逻辑。
