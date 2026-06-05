# Codex 开发说明

## 项目目标

构建 `boss-jobpilot`：一个本地优先的 AI 求职代理。核心不是模板化简历，而是通过结构化经历库匹配岗位 JD 和公司要求，生成精准投递包。

## 开发优先级

1. 先完成数据模型和本地 CRUD。
2. 再完成岗位采集和标准化。
3. 再接 AI 分析和生成。
4. 最后做自动化辅助填写和投递统计。

## 关键约束

- 不编造用户经历。
- 默认本地存储敏感数据。
- 自动发送和自动投递必须显式授权。
- AI 输出必须结构化校验。
- 每份简历必须保存使用的经历素材和改写说明。
- `.codegraph/` 是本地索引目录，必须保持 git 忽略，不提交入库。
- 每次修改代码后，在验证和提交前执行 `codegraph sync .` 更新本地 codegraph 索引。

## 推荐实现顺序

```text
1. 初始化 monorepo
2. 建立 shared Zod schema
3. 建立 db schema
4. 实现 API CRUD
5. 实现 Web 经历库
6. 实现 Extension 页面采集
7. 实现 JD Parser
8. 实现匹配评分
9. 实现 Greeting Writer
10. 实现 Resume Writer
11. 实现投递看板
12. 实现插件辅助填入
```

## 启动约定

- 新手入口：根目录 `start.bat`。
- 程序员入口：根目录 `npm run dev`。
- `npm run dev` 默认只启动 API 和 Web，不启动插件。
- 插件开发使用 `npm run dev:extension`。
- 全 workspace 并行 dev 使用 `npm run dev:workspace`，仅在需要同时跑全部应用时使用。

## Definition of Done

每个任务完成时必须说明：

- 改了哪些文件。
- 实现了什么用户可见能力。
- 如何验证。
- 还有哪些已知限制。
- 是否已同步 codegraph 索引。
