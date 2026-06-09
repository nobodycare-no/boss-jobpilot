# AI Agent 设计

## Agent 目标

AI 不直接替用户做职业决策，而是负责：

- 提取岗位和公司要求。
- 从经历库中找证据。
- 生成可投递材料。
- 标记风险和不确定性。
- 复盘投递效果并优化策略。

## Agent 划分

### JD Parser

输入：

- 岗位标题
- 原始 JD
- 公司字段

输出：

- 必须技能
- 加分技能
- 业务场景
- 软性要求
- 隐含要求
- 风险关键词

### Company Analyst

输入：

- 公司名称
- 页面展示的行业、规模、融资阶段
- 可选的公开信息摘要

输出：

- 公司类型
- 可能关注的候选人特质
- 风险信号
- 面试需确认的问题

### Experience Matcher

输入：

- 结构化 JD
- 用户经历库
- 用户求职目标

输出：

- 推荐使用的经历素材
- 推荐弱化或删除的经历
- 每段经历对应的 JD 证据
- 真实性风险提示

### Resume Writer

输入：

- 岗位分析
- 匹配经历
- 简历模板

输出：

- 简历 Markdown
- 改写说明
- 使用经历清单
- 面试讲解提醒

### Greeting Writer

输入：

- 岗位分析
- 用户亮点
- 招聘者角色

输出：

- 简短版
- 技术版
- 高意向版
- 跟进版

### Interview Coach

输入：

- 岗位
- 公司
- 投递简历版本

输出：

- 自我介绍
- 项目讲解稿
- 可能问题
- 回答要点
- 反问问题

## 真实性规则

所有生成 Agent 必须遵守：

- 不编造工作经历。
- 不编造公司、项目、时间、学历。
- 不把“参与”改成“主导”，除非经历库标记允许。
- 不写入用户标记为“不可写”的素材。
- 对没有量化证据的数据使用模糊表达，例如“提升了稳定性”，不要编造百分比。
- 每份简历保存“改写说明”，方便用户审查。

## 输出校验

AI 输出应使用 JSON schema 或 Zod schema 校验。

错误处理：

- 校验失败：要求模型重新输出。
- 证据不足：返回需要用户补充的问题。
- 低置信度：标记为“需人工确认”。

## Provider 预留

当前代码已经预留 OpenAI-compatible Provider 适配层，默认用于 PackyAPI 中转站。

环境变量：

```text
AI_PROVIDER=packyapi
AI_API_KEY=你的 PackyAPI Key
AI_API_BASE_URL=https://www.packyapi.com/v1
AI_MODEL=gpt-5
```

兼容别名：

```text
AI_BASE_URL=
PACKY_API_KEY=
PACKY_API_BASE_URL=
PACKY_API_MODEL=
```

接入原则：

- 密钥只放在本地 `.env` 或系统环境变量中，不提交到 Git。
- API 端通过 `createAiProviderFromEnv(process.env)` 创建 Provider。
- 未配置密钥时，继续使用本地规则版生成器。
- 已接入 Provider 的能力应继续通过 Zod schema 校验输出。

## Prompt 版本管理

每个 Agent 的 Prompt 需要版本号：

```text
jd-parser@0.1.0
experience-matcher@0.1.0
resume-writer@0.1.0
greeting-writer@0.1.0
interview-coach@0.1.0
```

每次生成结果保存：

- prompt_version
- model_name
- input_hash
- output_hash
- created_at
