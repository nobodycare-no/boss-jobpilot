# 进度追踪计划

## 工作方式

采用短迭代：

- 每个里程碑拆成可验收任务。
- 每个任务必须有明确输入、输出和验收标准。
- 每次开发结束更新进度表。
- 重要设计变更记录到 ADR。

## 状态定义

| 状态        | 含义             |
| ----------- | ---------------- |
| Todo        | 尚未开始         |
| In Progress | 正在开发         |
| Blocked     | 被依赖或问题阻塞 |
| Review      | 等待检查         |
| Done        | 已实现并通过验收 |

## 当前进度

| 模块          | 状态        | 说明                                                                |
| ------------- | ----------- | ------------------------------------------------------------------- |
| 项目命名      | Done        | 使用 `boss-jobpilot`                                                |
| 技术栈设计    | Done        | 已形成初版文档                                                      |
| 系统架构      | Done        | 已形成初版文档                                                      |
| 数据模型      | Done        | 已形成初版文档                                                      |
| AI Agent 设计 | Done        | 已形成初版文档                                                      |
| 安全与合规    | Done        | 已形成初版文档                                                      |
| 代码脚手架    | Done        | 已初始化 pnpm workspace、Web/API/Extension 和共享包                 |
| 经历库        | Done        | 已支持 SQLite 持久化、API CRUD 和 Web 端录入管理                    |
| 岗位采集      | Done        | 已支持岗位池 SQLite 持久化、API CRUD、Web 手动录入和插件一键保存    |
| 简历生成      | Done        | 已支持基于岗位分析和匹配经历生成 Markdown 定制简历草稿              |
| 投递管理      | In Progress | 已支持打招呼语草稿、application draft 持久化和基础状态流转          |

## 每日开发记录模板

```markdown
# YYYY-MM-DD

## Done

-

## In Progress

-

## Blocked

-

## Decisions

-

## Next

-
```

## ADR 模板

架构决策记录放在 `docs/adr/`。

```markdown
# ADR-0001: 标题

## Status

Accepted / Proposed / Rejected

## Context

为什么需要这个决策。

## Decision

做出的选择。

## Consequences

影响、收益和代价。
```

## 验收规则

每个功能合并前至少满足：

- 有清晰的用户路径。
- 有基本错误处理。
- 有必要的单元测试或手动验证记录。
- 不破坏已有数据。
- 文档同步更新。

## 2026-06-05 更新

### Done

- 岗位分析结果已从临时评分扩展为结构化分析对象。
- 新增 `job_analyses` SQLite 持久化表和仓库，支持按岗位查询历史分析与最新分析。
- `POST /jobs/:id/analyze` 会生成并保存分析结果，同时保留旧版 `score` 字段以兼容旧调用。
- 新增 `GET /jobs/:id/analyses` 与 `GET /jobs/:id/analysis/latest`。
- Web 岗位池支持展示分数、推荐动作、匹配关键词、必需技能、加分技能、风险信号和简历策略。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run format`
- `npm run lint`
- `npm run build`

### Next

- 将经历库素材纳入岗位分析，输出 `matchedExperienceIds`。
- 在 AI 包中接入真实模型调用，替换或增强当前规则分析器。
- 基于岗位分析结果生成个性化打招呼语和定制简历草稿。

## 2026-06-05 更新 2

### Done

- 岗位分析已接入经历库素材，规则分析器会按技能、关键词、职责/成果文本、证据等级和负责程度筛选最相关经历。
- `matchedExperienceIds` 不再固定为空，API 分析和临时分析都会读取当前经历库。
- Web 岗位分析卡新增“匹配经历”展示，为后续定制简历生成提供可追踪素材入口。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run format`
- `npm run lint`
- `npm run build`

### Next

- 将 `matchedExperienceIds` 从 ID 展示升级为经历标题/摘要展示。
- 基于匹配经历生成第一版 Markdown 定制简历。
- 接入真实 AI 模型前，先定义简历生成输入/输出 schema 和版本记录。

## 2026-06-05 更新 3

### Done

- 新增 `docs/11-user-guide.md`，作为当前软件的持续维护使用手册。
- 新增 `ResumeVersion` 共享 schema 和 SQLite `resume_versions` 持久化仓库。
- `POST /jobs/:id/resumes` 支持基于最新岗位分析和匹配经历生成 Markdown 定制简历草稿。
- 新增 `GET /jobs/:id/resumes` 与 `GET /jobs/:id/resume/latest`。
- Web 岗位卡支持一键生成定制简历，并展示变更摘要和 Markdown 预览。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Next

- 将定制简历从只读预览升级为可编辑版本管理。
- 生成个性化打招呼语，并与简历版本组成投递包。
- 用真实 AI 模型增强规则版简历生成器。

## 2026-06-05 更新 4

### Done

- 新增 `Application` 共享 schema 和 SQLite `applications` / `application_events` 初始化表。
- 新增 application repository，支持按岗位查询历史草稿和最新草稿。
- `POST /jobs/:id/greetings` 支持基于最新岗位分析、匹配经历和最新简历版本生成打招呼语草稿。
- 新增 `GET /jobs/:id/applications` 与 `GET /jobs/:id/application/latest`。
- Web 岗位卡新增“生成打招呼语”按钮，并展示打招呼语草稿和关联简历版本。
- `packages/ai` 新增规则版 greeting writer，后续可替换为真实 AI provider。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Next

- 将简历草稿和打招呼语组合成统一“投递包”视图。
- 支持复制打招呼语、复制 Markdown 简历、标记投递状态。
- 将匹配经历 ID 展示升级为经历标题和摘要。

## 2026-06-05 更新 5

### Done

- `.codegraph/` 已加入 git 忽略，避免本地索引文件进入仓库。
- `docs/10-dev-notes-for-codex.md` 已补充 codegraph 维护规则：修改代码后、提交前执行 `codegraph sync .`。
- 新增 `ApplicationUpdateSchema` 和 `ApplicationEvent` 共享类型。
- application repository 支持更新投递状态、自动维护 `updatedAt`，并在状态变化时写入 `application_events`。
- 新增 `PATCH /applications/:id` 和 `GET /applications/:id/events`。
- Web 打招呼语草稿面板新增状态按钮，可标记已打招呼、已投递、已回复、面试和关闭。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`
- API 前台启动验证：`API_PORT=4302` 可监听 `http://127.0.0.1:4302`

### Next

- 增加投递看板视图，按状态聚合岗位。
- 支持复制打招呼语和 Markdown 简历。
- 将应用事件时间线展示到 Web。

## 2026-06-06 更新 1

### Done

- Web 定制简历草稿面板新增“复制”按钮，可复制完整 Markdown 简历内容。
- Web 打招呼语草稿面板新增“复制”按钮，可复制当前话术。
- 复制成功后显示轻量成功提示；复制失败时提示用户手动选择内容复制。
- 使用手册已同步更新复制入口和推荐工作流。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`

### Next

- 增加投递看板视图，按状态聚合岗位。
- 将应用事件时间线展示到 Web。
- 将匹配经历 ID 展示升级为经历标题和摘要。

## 2026-06-06 更新 2

### Done

- Web 岗位分析面板已将匹配经历从原始 ID 展示升级为经历标题、摘要和技术栈展示。
- `App` 将当前经历库素材传入 `JobPool`，岗位池无需额外请求即可解析匹配经历。
- 若历史分析引用的经历已不存在，界面会退回显示原始经历 ID，避免丢失线索。
- 使用手册已同步更新匹配经历展示说明和故障排查。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`

### Next

- 增加投递看板视图，按状态聚合岗位。
- 将应用事件时间线展示到 Web。
- 支持从岗位卡片导出完整投递包文本。

## 2026-06-06 更新 3

### Done

- 修复已保存岗位删除链路：删除岗位时会同步清理关联的投递事件、投递草稿、简历版本和岗位分析。
- `job-repository` 新增级联清理测试，覆盖已生成完整投递包后删除岗位的场景。
- API 路由测试新增 `DELETE /jobs/:id` 验证，确保完整投递包岗位删除后岗位池为空。
- 使用手册已同步说明岗位删除会清理关联数据。

### Verification

- `corepack pnpm --filter @boss-jobpilot/db test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`

### Next

- 增加投递看板视图，按状态聚合岗位。
- 将应用事件时间线展示到 Web。
- 支持从岗位卡片导出完整投递包文本。
