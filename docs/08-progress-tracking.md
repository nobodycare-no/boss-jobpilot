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

| 模块          | 状态 | 说明                                                |
| ------------- | ---- | --------------------------------------------------- |
| 项目命名      | Done | 使用 `boss-jobpilot`                                |
| 技术栈设计    | Done | 已形成初版文档                                      |
| 系统架构      | Done | 已形成初版文档                                      |
| 数据模型      | Done | 已形成初版文档                                      |
| AI Agent 设计 | Done | 已形成初版文档                                      |
| 安全与合规    | Done | 已形成初版文档                                      |
| 代码脚手架    | Done | 已初始化 pnpm workspace、Web/API/Extension 和共享包 |
| 经历库        | Todo | 待开发                                              |
| 岗位采集      | Todo | 待开发                                              |
| 简历生成      | Todo | 待开发                                              |
| 投递管理      | Todo | 待开发                                              |

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
