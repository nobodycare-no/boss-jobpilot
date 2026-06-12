# boss-jobpilot

`boss-jobpilot` 是一个本地优先的 AI 求职工作台，用来把岗位保存、岗位分析、简历素材管理、定制简历、打招呼语和投递跟进集中到一个可控的本地流程里。

项目的核心原则：

- 数据默认保存在本机，本项目不提供云端同步服务。
- AI 只作为分析和生成助手，发送前始终由用户确认。
- 简历内容基于真实素材生成，强调表达优化，不鼓励编造经历。
- Boss 直聘插件只负责采集和辅助复制，不会自动投递或自动发送消息。

## 功能概览

- 本地 Web 工作台：维护简历素材、保存岗位、查看岗位池和投递阶段。
- Chrome 插件：从 Boss 直聘岗位页采集当前岗位，并读取本地生成的打招呼语或投递包。
- 岗位分析：提取岗位重点、匹配经历、风险信号和投递建议。
- 简历素材：支持录入结构化经历，也支持直接添加整份简历作为分析素材。
- 定制简历：按岗位生成 Markdown 简历草稿，并保留版本记录。
- 打招呼语：按岗位和简历素材生成短消息草稿。
- 投递跟进：记录打招呼、投递、回复、面试等状态，并设置下一次跟进时间。
- 本地降级：未配置 AI Provider 或调用失败时，仍可使用规则版逻辑完成基础生成。

## 快速开始

Windows 用户可以在项目根目录双击：

```text
start.bat
```

脚本会检查 Node/Corepack、安装缺失依赖，并启动本地 API 与 Web 工作台。

启动后访问：

```text
http://127.0.0.1:5173
```

开发者也可以直接运行：

```powershell
npm run dev
```

默认服务地址：

- API：`http://127.0.0.1:4000`
- Web：`http://127.0.0.1:5173`

## AI Provider

项目支持 OpenAI-compatible API。复制 `.env.example` 为 `.env`，然后按需填写：

```text
AI_API_KEY=your_api_key
AI_API_BASE_URL=https://your-provider.example/v1
AI_MODEL=your-model-id
```

配置变更后需要重启 API。不要把真实密钥提交到 Git。

未配置 `AI_API_KEY` 时，系统会使用本地规则版分析和生成逻辑；配置后，岗位分析、简历草稿、打招呼语和策略复盘会优先使用真实模型。

## Chrome 插件

开发模式启动：

```powershell
npm run dev:extension
```

生产构建：

```powershell
corepack pnpm --filter @boss-jobpilot/extension build
```

然后在 Chrome 打开 `chrome://extensions`，启用开发者模式，加载构建目录：

```text
apps/extension/build/chrome-mv3-dev
```

或生产构建目录：

```text
apps/extension/build/chrome-mv3-prod
```

插件需要本地 API 已启动。它会把当前 Boss 直聘页面识别出的岗位保存到本地岗位池，也可以从本地读取已生成的打招呼语或完整投递包。

## 数据存储

默认 SQLite 数据库位置：

```text
data/jobpilot.sqlite
```

可以通过环境变量覆盖：

```powershell
$env:DATABASE_PATH="D:\path\jobpilot.sqlite"
npm run dev:api
```

`data/`、`.tmp/`、`.env` 和 SQLite 文件默认被 Git 忽略。

## 常用脚本

```powershell
npm run dev
npm run dev:api
npm run dev:web
npm run dev:extension
npm run typecheck
npm run test
npm run lint
npm run build
```

若本机没有直接安装 pnpm，可以通过 Corepack 调用：

```powershell
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```

## 项目结构

- `apps/web`：本地求职工作台。
- `apps/api`：本地 Fastify API。
- `apps/extension`：Chrome 插件。
- `packages/shared`：共享 Zod schema 和类型。
- `packages/db`：SQLite schema、初始化和仓储层。
- `packages/ai`：AI Provider 与生成逻辑。
- `packages/resume`：简历 Markdown 生成逻辑。
- `packages/scoring`：岗位匹配评分逻辑。
- `docs/11-user-guide.md`：当前用户使用手册。

## 文档

- [用户使用手册](docs/11-user-guide.md)

## 安全说明

本项目面向个人本地使用。公开仓库不包含内部产品规划、开发协作记录、私有安全审计细节、真实数据库、密钥或个人简历数据。使用前仍建议自行检查 `.env`、`data/`、`.tmp/` 和浏览器插件构建产物，避免误提交个人信息。
