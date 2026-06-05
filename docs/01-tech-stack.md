# 技术栈

## 技术选型原则

- 本地优先：敏感数据默认保存在用户本机。
- TypeScript 优先：前端、插件、后端共享类型。
- 插件辅助：从招聘页面读取信息并辅助填入内容。
- AI 可替换：通过统一 Provider 接口接入不同大模型。
- MVP 简洁：先实现可用闭环，再扩展多平台和深度自动化。

## 推荐栈

| 层级              | 技术                                    | 用途                                         |
| ----------------- | --------------------------------------- | -------------------------------------------- |
| Monorepo          | pnpm workspace + Turborepo              | 多应用和共享包管理                           |
| Web App           | React + Vite + TypeScript               | 本地求职工作台                               |
| UI                | Tailwind CSS + shadcn/ui + lucide-react | 快速构建一致的操作界面                       |
| Browser Extension | Chrome Manifest V3 + Plasmo             | Boss 页面采集、侧边栏、辅助填充              |
| Local API         | Node.js + Fastify                       | 本地服务、AI 编排、文件生成                  |
| Database          | SQLite                                  | 本地结构化数据                               |
| ORM               | Drizzle ORM                             | 类型安全数据库访问                           |
| Search            | SQLite FTS5                             | 经历库和岗位文本检索                         |
| Vector Search     | sqlite-vec 或后续独立向量库             | 语义匹配经历和 JD                            |
| AI Layer          | Provider Adapter                        | 接入 OpenAI-compatible、本地模型或其他云模型 |
| Document Output   | Markdown + DOCX/PDF renderer            | 生成简历源文件和投递版文件                   |
| Automation        | Playwright                              | 受控浏览器自动化测试和后续辅助操作           |
| Validation        | Zod                                     | AI 输出、表单和接口校验                      |
| Testing           | Vitest + Playwright                     | 单元测试和端到端测试                         |
| Lint/Format       | ESLint + Prettier                       | 代码质量                                     |

## 项目结构建议

```text
boss-jobpilot/
├─ apps/
│  ├─ web/                 # 本地工作台
│  ├─ extension/           # Chrome 插件
│  └─ api/                 # 本地 Fastify 服务
├─ packages/
│  ├─ shared/              # 共享类型、常量、Zod schema
│  ├─ db/                  # Drizzle schema、迁移、仓储
│  ├─ ai/                  # Prompt、Agent、Provider Adapter
│  ├─ resume/              # 简历生成、渲染、模板
│  └─ scoring/             # 岗位匹配评分和风险规则
├─ docs/
├─ scripts/
└─ tests/
```

## 为什么这样选

- React + Vite 比完整 SSR 框架更适合本地工具，启动和打包简单。
- Chrome MV3 插件适合读取招聘页面 DOM、提供侧边栏和一键填充。
- Fastify + SQLite 足够支撑本地应用，避免早期引入复杂部署。
- Drizzle + Zod 能让数据结构、接口输入和 AI 输出更可控。
- AI Provider Adapter 避免锁死某一家模型服务。

## 后续可选升级

- 用 Tauri 打包为桌面应用。
- 接入本地模型处理低敏任务。
- 增加多招聘平台适配器。
- 增加端到端加密同步。
- 增加 OCR 和 PDF 简历解析。
