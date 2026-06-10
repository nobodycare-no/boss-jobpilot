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

| 模块          | 状态        | 说明                                                             |
| ------------- | ----------- | ---------------------------------------------------------------- |
| 项目命名      | Done        | 使用 `boss-jobpilot`                                             |
| 技术栈设计    | Done        | 已形成初版文档                                                   |
| 系统架构      | Done        | 已形成初版文档                                                   |
| 数据模型      | Done        | 已形成初版文档                                                   |
| AI Agent 设计 | Done        | 已形成初版文档                                                   |
| 安全与合规    | Done        | 已形成初版文档                                                   |
| 代码脚手架    | Done        | 已初始化 pnpm workspace、Web/API/Extension 和共享包              |
| 经历库        | Done        | 已支持 SQLite 持久化、API CRUD 和 Web 端录入管理                 |
| 岗位采集      | Done        | 已支持岗位池 SQLite 持久化、API CRUD、Web 手动录入和插件一键保存 |
| 简历生成      | Done        | 已支持基于岗位分析和匹配经历生成 Markdown 定制简历草稿           |
| 投递管理      | In Progress | 已支持打招呼语草稿、application draft 持久化和基础状态流转       |

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
- `git diff --check`
- `codegraph sync .`

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
- `git diff --check`
- `codegraph sync .`

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
- Chrome DevTools 本地页面验证：`全部 2`、`未生成草稿 1`、`已打招呼 1` 计数正确，点击状态后岗位列表按 `1/2` 收窄。

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

## 2026-06-06 更新 4

### Done

- Web 岗位池新增投递状态看板，按全部、未生成草稿、草稿、已打招呼、已投递、已回复、面试中、Offer、已拒绝、已关闭聚合数量。
- 点击看板状态可筛选岗位列表，岗位数量显示为当前筛选数/总数。
- 空筛选状态会显示明确空状态提示。
- 使用手册已同步更新投递看板说明和推荐工作流。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`

### Next

- 将应用事件时间线展示到 Web。
- 支持从岗位卡片导出完整投递包文本。
- 支持按跟进时间筛选待处理岗位。

## 2026-06-08 更新 1

### Done

- Web 打招呼语草稿面板新增状态时间线，展示 `application_events` 中记录的状态变更。
- Web 加载岗位池时会同步加载每个最新投递草稿的事件；生成草稿和更新状态后会刷新对应事件列表。
- 岗位卡片状态按钮补齐 `Offer` 和 `已拒绝`，与投递看板状态保持一致。
- 使用手册和迭代计划已同步更新投递时间线说明。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`
- Chrome DevTools 本地页面验证：岗位卡片显示 `Offer`、`已拒绝` 状态按钮，状态时间线正确展示“草稿 -> 已打招呼 -> 已投递”的两次状态变更。

### Next

- 支持从岗位卡片导出完整投递包文本。
- 支持按跟进时间筛选待处理岗位。
- 增加今日待跟进提醒入口。

## 2026-06-08 更新 2

### Done

- Web 岗位卡片操作区新增“复制投递包”入口。
- 投递包以 Markdown 输出岗位信息、JD、岗位分析、匹配经历、定制简历、打招呼语、投递状态和状态时间线。
- 未生成的分析、简历或打招呼语会在投递包中显示明确占位，便于后续补齐。
- 使用手册和迭代计划已同步更新完整投递包说明。

### Verification

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`
- Chrome DevTools 本地页面验证：点击“复制投递包”后显示成功提示；系统剪贴板中的 Markdown 包含投递包标题、岗位信息、岗位分析、Markdown 简历、打招呼语和状态时间线。

### Next

- 支持按跟进时间筛选待处理岗位。
- 增加今日待跟进提醒入口。
- 支持多版本话术和简历版本对比。

## 2026-06-08 更新 3

### Done

- Web 投递看板新增“今日待跟进”入口，统计并筛选下次跟进时间早于或等于今天结束的岗位。
- 打招呼语草稿面板新增“下次跟进”时间输入框，支持保存和清除本地跟进时间。
- `ApplicationUpdateSchema` 修正为无默认值的 PATCH schema，避免只更新跟进时间时把状态隐式重置为草稿。
- API 和 application repository 测试覆盖跟进时间写入、清除和不产生额外状态事件的场景。
- 使用手册已同步更新跟进时间入口和推荐工作流。

### Verification

- `corepack pnpm --filter @boss-jobpilot/db test`
- `corepack pnpm --filter @boss-jobpilot/api test`

### Next

- 增加更完整的待跟进视图，例如按逾期、今天、未来 3 天分组。
- 支持多版本话术和简历版本对比。
- 增加投递复盘 UI，汇总回复率、面试率和不同版本效果。

## 2026-06-08 更新 4

### Done

- Web 岗位池新增独立跟进队列区，保留“今日待跟进”总入口，并拆分为“逾期”“今天”“未来 3 天”。
- 跟进队列按 `nextFollowUpAt` 的本地日期归类：早于今天为逾期，今天内为今天，今天之后 3 天内为未来 3 天。
- 点击跟进队列可筛选岗位列表；空队列会显示明确空状态。
- 使用手册已同步更新跟进队列说明。

### Verification

- `npm run format`
- `corepack pnpm --filter @boss-jobpilot/shared --filter @boss-jobpilot/db --filter @boss-jobpilot/api --filter @boss-jobpilot/web --filter @boss-jobpilot/extension --filter @boss-jobpilot/ai --filter @boss-jobpilot/resume --filter @boss-jobpilot/scoring --recursive --if-present typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`
- Chrome DevTools 本地页面验证：跟进队列显示“今日待跟进 3 / 逾期 1 / 今天 2 / 未来 3 天 1”；点击“逾期”“今天”“未来 3 天”后岗位列表分别显示 1/4、2/4、1/4。

### Next

- 支持多版本话术和简历版本对比。
- 增加投递复盘 UI，汇总回复率、面试率和不同版本效果。
- 支持按岗位状态、跟进时间和公司/城市组合筛选。

## 2026-06-08 更新 5

### Done

- Web 岗位池加载每个岗位的简历版本历史和打招呼语草稿历史。
- 生成新简历或新打招呼语后，会同步刷新当前岗位的版本历史。
- 岗位卡片新增“版本对比”，当同一岗位存在至少两版简历或两版话术时，对比最新和上一版。
- 简历对比展示生成时间、变更摘要、正文长度和选用经历数量；话术对比展示状态、更新时间和消息摘要。
- 对比面板支持复制最新或上一版 Markdown 简历、打招呼语。
- 使用手册已同步更新版本对比说明。

### Verification

- `npm run format`
- `corepack pnpm --filter @boss-jobpilot/shared --filter @boss-jobpilot/db --filter @boss-jobpilot/api --filter @boss-jobpilot/web --filter @boss-jobpilot/extension --filter @boss-jobpilot/ai --filter @boss-jobpilot/resume --filter @boss-jobpilot/scoring --recursive --if-present typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`
- 本地浏览器验证：使用 2 版简历和 2 版打招呼语的岗位，页面显示“版本对比”“简历 2 / 话术 2”“最新简历”“上一版简历”“最新话术”“上一版话术”；点击对比面板复制按钮后显示“最新 Markdown 简历已复制”。

### Next

- 增加投递复盘 UI，汇总回复率、面试率和不同版本效果。
- 支持按岗位状态、跟进时间和公司/城市组合筛选。
- 将版本对比从摘要升级为字段级 diff。

## 2026-06-09 更新 1

### Done

- Web 岗位池新增第一版投递复盘摘要，展示投递推进率、回复率、面试转化和平均匹配分。
- 复盘摘要新增跟进风险提示，覆盖逾期跟进和推进中但未设置下次跟进的岗位。
- 复盘摘要新增投递建议、城市、版本迭代三组轻量分布。
- 复盘口径拆分到 `application-review` 模块，并新增单元测试覆盖转化率、跟进风险和分布统计。
- 使用手册和迭代计划已同步更新投递复盘说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`

### Next

- 支持按公司类型、岗位类型和具体简历/话术版本做效果归因。
- 将投递复盘从摘要升级为可筛选的复盘页。
- 接入 AI 策略复盘，基于真实投递结果给出下一轮投递策略。

## 2026-06-09 更新 2

### Done

- 投递复盘摘要新增“效果归因”区，支持按岗位类型、城市、投递建议和具体简历版本分组查看效果。
- 归因分组展示该组岗位总数、已投递数量、回复率和面试率。
- 岗位类型支持基于标题轻量识别 AI / 算法、全栈 / 后端、前端、数据、实习 / 校招和其他。
- 简历版本归因会按 application 关联的 `resumeVersionId` 分组，未关联简历版本和未生成话术会单独显示。
- `application-review` 单元测试已覆盖归因排序、回复率、面试率和版本分组口径。
- 使用手册和迭代计划已同步更新效果归因说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`

### Next

- 支持按公司类型做效果归因。
- 将投递复盘从摘要升级为可筛选的复盘页。
- 接入 AI 策略复盘，基于真实投递结果给出下一轮投递策略。

## 2026-06-09 更新 3

### Done

- 投递复盘效果归因新增“公司类型”分组。
- 公司类型优先根据公司名归类，支持科技产品、金融、外包 / 服务商、教育、电商 / 零售、游戏、其他公司；公司名缺失时回退使用岗位标题和 JD。
- `application-review` 单元测试新增公司类型归因覆盖，验证金融、科技产品、外包 / 服务商和其他公司的分组口径。
- 使用手册和迭代计划已同步更新公司类型归因说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `codegraph sync .`

### Next

- 将投递复盘从摘要升级为可筛选的复盘页。
- 接入 AI 策略复盘，基于真实投递结果给出下一轮投递策略。

## 2026-06-09 更新 4

### Done

- 投递复盘新增“策略建议”区域。
- `application-review` 会基于逾期跟进、未设置下次跟进、回复率、平均匹配分、定制简历覆盖率和效果归因信号生成最多 4 条规则版行动建议。
- 空数据时会显示“积累复盘样本”的起步建议，避免复盘区域无指引。
- 使用手册和迭代计划已同步说明策略建议当前是规则版，AI 策略复盘仍未接入。

### Verification

- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `codegraph sync .`

### Next

- 将投递复盘从摘要升级为可筛选的复盘页。
- 接入 AI 策略复盘，基于真实投递结果给出下一轮投递策略。

## 2026-06-09 更新 5

### Done

- 投递复盘新增复盘范围筛选器，支持按投递状态、投递建议和城市筛选。
- 复盘筛选只影响复盘摘要、轻量分布、效果归因和策略建议，不影响岗位列表自身的看板筛选。
- `application-review` 新增可测试的复盘筛选纯函数，并覆盖组合筛选、未分析和未生成草稿边界。
- 使用手册和迭代计划已同步更新复盘筛选说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `codegraph sync .`

### Next

- 接入 AI 策略复盘，基于真实投递结果给出下一轮投递策略。

## 2026-06-09 更新 6

### Done

- `shared` 新增投递复盘策略请求和响应 schema，统一前后端数据结构。
- `packages/ai` 新增 `generateApplicationReviewStrategyRecap`，可以基于复盘指标、规则建议和归因信号生成结构化策略复盘。
- API 新增 `POST /applications/review/strategy`，返回复盘摘要、下一步重点、建议实验和风险提醒。
- Web 投递复盘面板新增“AI 策略复盘”区域，会随当前复盘筛选范围自动刷新。
- 当前模型名仍为 `rule-based`，真实 AI Provider 尚未接入。
- 使用手册和迭代计划已同步更新 AI 策略复盘状态。

### Verification

- `corepack pnpm --filter @boss-jobpilot/ai test`
- `corepack pnpm --filter @boss-jobpilot/web test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `codegraph sync .`

### Next

- 接入真实 AI Provider，让岗位分析、简历生成、打招呼语和策略复盘都能切换到真实模型。

## 2026-06-09 更新 7

### Done

- `packages/ai` 新增 OpenAI-compatible Provider 适配器，默认 base URL 面向 PackyAPI：`https://www.packyapi.com/v1`。
- 新增 `createAiProviderFromEnv`，支持 `AI_API_KEY`、`AI_API_BASE_URL`、`AI_MODEL`，并兼容 `AI_BASE_URL`、`PACKY_API_KEY`、`PACKY_API_BASE_URL`、`PACKY_API_MODEL`。
- API 启动时会从环境变量创建 AI Provider；未配置密钥时继续回退规则版生成逻辑。
- 投递复盘策略接口已支持配置 Provider 后走真实模型。
- `.env.example`、README、使用手册、AI Agent 设计和安全合规文档已同步 PackyAPI 配置说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/ai test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

### Next

- 将真实 Provider 扩展到岗位分析、简历生成和打招呼语生成。

## 2026-06-09 更新 8

### Done

- `packages/ai` 新增 `generateGreetingDraftWithProvider`，配置 AI Provider 时可用 PackyAPI 生成打招呼语。
- 打招呼语模型输出使用 Zod 校验，必须包含 message、selectedExperienceIds、highlights、modelName 和 promptVersion。
- API 的 `POST /jobs/:id/greetings` 已接入可选 Provider；未配置密钥时仍回退规则版。
- API 测试新增 fake Provider 覆盖，确认打招呼语路由会使用配置的模型输出。

### Verification

- `corepack pnpm --filter @boss-jobpilot/ai test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `codegraph sync .`

### Next

- 将真实 Provider 扩展到岗位分析和简历生成。

## 2026-06-09 更新 9

### Done

- `packages/ai` 新增 `generateJobAnalysisWithProvider`，配置 AI Provider 时可用 PackyAPI 生成结构化岗位分析。
- 岗位分析 Provider 输出会合并规则版草稿，并使用 `JobAnalysisCreateSchema` 校验，降低模型漏字段导致的失败风险。
- `matchedExperienceIds` 会被限制为真实经历库中存在的 ID，避免模型编造经历引用。
- API 的 `POST /jobs/:id/analyze` 和 `POST /jobs/analyze` 已接入可选 Provider；未配置密钥时仍回退规则版。
- API 测试新增 fake Provider 覆盖，确认岗位分析路由会使用配置的模型输出。

### Verification

- `corepack pnpm --filter @boss-jobpilot/ai test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `codegraph sync .`

### Next

- 将真实 Provider 扩展到简历生成。

## 2026-06-09 更新 10

### Done

- `packages/ai` 新增 `generateResumeVersionWithProvider`，配置 AI Provider 时可用 PackyAPI 生成最终 Markdown 简历版本。
- 简历 Provider 输出会合并规则版兜底草稿，并使用 `ResumeVersionCreateSchema` 校验。
- `selectedExperienceIds` 会被限制为真实经历库中存在的 ID，避免模型编造经历引用。
- API 的 `POST /jobs/:id/resumes` 已接入可选 Provider；未配置密钥时仍回退规则版。
- API 测试新增 fake Provider 覆盖，确认分析、简历和打招呼语可以在同一工作流中使用配置的模型输出。
- 使用手册和迭代计划已同步更新 AI Provider 覆盖范围。

### Verification

- `corepack pnpm --filter @boss-jobpilot/ai test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `codegraph sync .`

### Next

- 为真实 Provider 调用增加失败兜底和用户可见错误提示，避免模型异常中断投递工作流。

## 2026-06-09 更新 11

### Done

- API 新增统一的 Provider 失败兜底逻辑；真实模型调用失败时会继续使用规则版结果。
- 岗位分析、即时岗位分析、定制简历、打招呼语和 AI 策略复盘响应新增 `warnings`，用于提示本次已降级为规则版。
- Web 工作台已读取 API warning，并在岗位操作和策略复盘区域显示用户可见提示。
- API 测试新增失败 Provider 覆盖，确认模型异常不会中断核心投递工作流。
- 使用手册和迭代计划已同步更新 Provider 失败兜底说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/api test`
- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `codegraph sync .`

### Next

- 增加 AI Provider 配置健康检查入口，帮助用户在正式投递前确认 PackyAPI 密钥、模型和网络是否可用。

## 2026-06-09 更新 12

### Done

- `packages/ai` 新增 `checkAiProviderHealth`，支持未配置、可用和失败三类健康状态。
- API 新增 `GET /ai/provider/health`，不会返回密钥，只返回 Provider 名称、检查时间、状态和错误摘要。
- Web 投递复盘区新增 AI Provider 状态条和手动刷新按钮，用于正式投递前检查 PackyAPI 配置。
- AI 和 API 测试新增健康检查覆盖，确认 Provider 探测失败时不会抛出到调用方。
- 使用手册和迭代计划已同步更新 AI Provider 健康检查说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/ai test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- 浏览器检查 `http://127.0.0.1:5173`，确认 AI Provider 状态条显示正常且未覆盖复盘内容。
- `git diff --check`
- `codegraph sync .`

### Next

- 增加 AI 生成请求的可观测记录，保存模型名、提示词版本、降级原因和生成耗时，方便后续排查和优化。

## 2026-06-09 更新 13

### Done

- 新增 `ai_generation_runs` 本地表，用于记录 AI 生成运行元数据。
- API 新增 `GET /ai/generation-runs`，返回最近 20 次 AI 生成记录。
- 岗位分析、即时分析、定制简历、打招呼语和策略复盘都会记录 provider_success、provider_fallback 或 rule_based 状态。
- Web 投递复盘区新增“最近 AI 生成”，展示最近 5 次模型调用、降级状态、耗时和 Prompt 版本。
- 使用手册、数据模型和迭代计划已同步更新。

### Verification

- `corepack pnpm --filter @boss-jobpilot/db test`
- `corepack pnpm --filter @boss-jobpilot/api test`
- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- 浏览器检查 `http://127.0.0.1:5194`，确认“最近 AI 生成”显示正常且未覆盖复盘筛选控件。
- `git diff --check`
- `codegraph sync .`

### Next

- 增加 AI 生成记录的筛选和明细面板，支持按能力、状态和岗位快速定位异常调用。

## 2026-06-09 更新 14

### Done

- Web 投递复盘区的“最近 AI 生成”新增能力、状态和岗位筛选。
- AI 生成记录支持点击选中，并在明细面板查看能力、状态、关联岗位、Provider、模型、Prompt 版本、耗时、时间和错误摘要。
- “最近 AI 生成”从固定展示 5 条升级为接收 API 最近记录后前端筛选展示，便于快速定位降级或规则版调用。
- 使用手册和迭代计划已同步更新筛选与明细说明。

### Verification

- `corepack pnpm --filter @boss-jobpilot/web test`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 浏览器检查 `http://127.0.0.1:5196`，确认“最近 AI 生成”筛选后从 `4/4` 变为 `1/4`，明细切换到测试岗位分析记录。
- `codegraph sync .`

### Next

- 为 `GET /ai/generation-runs` 增加 API 级查询参数和分页，避免记录增长后前端一次性筛选过多历史数据。

## 2026-06-10 更新 15

### Done

- 完成一次项目架构和范围审查，确认当前实现仍保持本地优先 monorepo 架构：Web 工作台、Chrome 插件、本地 API、SQLite 仓储、共享类型和 AI Provider 层边界清晰。
- 确认近期 AI Provider 健康检查和 AI 生成运行记录服务于 PackyAPI 接入、降级排查和 Prompt 版本追踪，不属于偏离主线的低价值功能。
- 清理 `.tmp` 验证残留，保持工作区不受临时日志和 SQLite 文件干扰。
- 收敛技术栈、数据模型、README 和产品需求文档，区分“当前已落地实现”和“后续路线图”，避免后续误以为 Tailwind/shadcn、FTS/向量检索、用户偏好表、技能证据表已经落地。

### Verification

- `git status --short`
- `rg --files`
- `rg -n "Tailwind|shadcn|Drizzle|FTS5|sqlite-vec|user_profile|skill_evidence|完整投递复盘 UI|Drizzle SQLite schema|Target MVP|用户求职目标和偏好配置" README.md docs package.json apps packages`
- `git diff --check`
- `codegraph sync .`

### Next

- 优先把 `apps/web/src/JobPool.tsx` 中稳定的面板组件拆出为独立文件，降低单文件维护风险；该任务应作为专门重构进行，避免和业务功能迭代混在一起。
