# boss-jobpilot

`boss-jobpilot` 是一个本地优先的 AI 求职工作台，用于集中管理岗位采集、岗位分析、简历素材、定制简历、打招呼语和投递跟进。项目面向个人求职流程，默认将数据保存在本机，不提供云端同步服务。

## 核心原则

- 本地优先：岗位、简历素材和投递记录默认写入本机 SQLite 数据库。
- 人工确认：插件不会自动投递，也不会自动向招聘方发送消息。
- 真实素材：简历生成基于用户提供的真实经历和简历内容，不鼓励编造经历。
- 可降级运行：未配置 AI Provider 时，系统仍可使用本地规则版逻辑完成基础分析和生成。

## 功能概览

- Web 工作台：维护简历素材、保存岗位、查看岗位池和投递阶段。
- 浏览器插件：从 Boss 直聘岗位页采集当前岗位，并读取本地生成的打招呼语或投递包。
- 岗位分析：提取岗位重点、匹配经历、风险信号和投递建议。
- 简历素材：支持结构化经历，也支持直接添加整份简历文本作为分析素材。
- 定制简历：按岗位生成 Markdown 简历草稿，并保留版本记录。
- 打招呼语：按岗位和简历素材生成短消息草稿。
- 投递跟进：记录打招呼、投递、回复、面试等状态，并设置下一次跟进时间。

## 环境要求

- Windows
- Node.js 24 或更新版本
- Corepack
- Chrome 或 Edge

Node.js 24 通常自带 Corepack。若 `start.bat` 提示找不到 Node.js 或 Corepack，请先安装或重新安装 Node.js。

## 新手启动

在项目根目录双击：

```text
start.bat
```

脚本会自动执行以下步骤：

1. 检查 Node.js 和 Corepack。
2. 如果缺少依赖，自动执行 `corepack pnpm install`。
3. 自动构建浏览器插件。
4. 启动本地 API。
5. 启动 Web 工作台。
6. 打开浏览器访问 Web 工作台。

默认访问地址：

```text
http://localhost:5173
```

备用地址：

```text
http://127.0.0.1:5173
```

本地 API 地址：

```text
http://127.0.0.1:4000
```

使用期间请保持 `boss-jobpilot API` 和 `boss-jobpilot Web` 两个命令行窗口打开。关闭这两个窗口即可停止项目。

## 加载浏览器插件

`start.bat` 会自动构建插件，但浏览器扩展仍需要用户手动导入。

构建完成后，插件目录为：

```text
apps/extension/build/chrome-mv3-prod
```

Chrome 加载方式：

1. 打开 `chrome://extensions`。
2. 启用“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择 `apps/extension/build/chrome-mv3-prod`。

Edge 加载方式：

1. 打开 `edge://extensions`。
2. 启用“开发人员模式”。
3. 点击“加载解压缩的扩展”。
4. 选择 `apps/extension/build/chrome-mv3-prod`。

如果更新代码后重新运行 `start.bat`，插件会重新构建。浏览器扩展页中已经加载过旧版本时，需要点击该扩展的“重新加载”按钮。若 Boss 直聘岗位页是在加载插件前打开的，也建议刷新岗位页后再使用插件。

## AI Provider

项目支持 OpenAI-compatible API。复制 `.env.example` 为 `.env`，然后按需填写：

```text
AI_API_KEY=your_api_key
AI_API_BASE_URL=https://your-provider.example/v1
AI_MODEL=your-model-id
```

修改 `.env` 后需要重启 API。不要把真实密钥提交到 Git。

未配置 `AI_API_KEY` 时，系统会使用本地规则版分析和生成逻辑。配置后，岗位分析、简历草稿、打招呼语和策略复盘会优先调用真实模型；调用失败时会回退到规则版结果。

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

## 开发命令

安装依赖：

```powershell
corepack pnpm install
```

启动 API 和 Web：

```powershell
npm run dev
```

单独启动：

```powershell
npm run dev:api
npm run dev:web
```

构建插件：

```powershell
corepack pnpm --filter @boss-jobpilot/extension build
```

检查与构建：

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

## 项目结构

- `apps/web`：本地求职工作台。
- `apps/api`：本地 Fastify API。
- `apps/extension`：Chrome/Edge 浏览器插件。
- `packages/shared`：共享 Zod schema、类型和清洗逻辑。
- `packages/db`：SQLite schema、初始化和仓储层。
- `packages/ai`：AI Provider 与生成逻辑。
- `packages/resume`：简历 Markdown 生成逻辑。
- `packages/scoring`：岗位匹配评分逻辑。
- `docs/11-user-guide.md`：用户使用手册。

## 文档

- [用户使用手册](docs/11-user-guide.md)

## 安全说明

本项目面向个人本地使用。公开仓库不包含内部产品规划、开发协作记录、私有安全审计细节、真实数据库、密钥或个人简历数据。使用前仍建议检查 `.env`、`data/`、`.tmp/` 和浏览器插件构建产物，避免误提交个人信息。
