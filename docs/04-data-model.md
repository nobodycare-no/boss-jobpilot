# 数据模型

## 设计原则

- 经历库是核心资产，不把简历当成唯一输入。
- 每次生成结果都要可追溯到岗位、经历素材和 Prompt 版本。
- AI 输出必须结构化保存，便于复盘和效果统计。

## 当前已落地核心表

当前 MVP 已落地的表包括：

- `experience_items`
- `companies`
- `job_postings`
- `job_analyses`
- `resume_versions`
- `applications`
- `application_events`
- `ai_generation_runs`

以下字段说明按业务对象使用单数命名；实际 SQLite 表名以代码中的复数表名为准。

### experience_item

经历素材。

| 字段             | 说明                                                  |
| ---------------- | ----------------------------------------------------- |
| id               | 主键                                                  |
| type             | project / internship / work / open_source / education |
| title            | 经历名称                                              |
| organization     | 公司、学校或项目组织                                  |
| role             | 担任角色                                              |
| start_date       | 开始时间                                              |
| end_date         | 结束时间                                              |
| summary          | 简述                                                  |
| tech_stack       | 技术栈                                                |
| responsibilities | 职责                                                  |
| achievements     | 成果                                                  |
| metrics          | 可证明数据                                            |
| evidence_level   | 可深入讲 / 可简单讲 / 了解 / 不可写                   |
| ownership_level  | 主导 / 负责 / 参与 / 协助                             |
| tags             | 标签                                                  |

### company

公司记录。

| 字段            | 说明     |
| --------------- | -------- |
| id              | 主键     |
| name            | 公司名称 |
| industry        | 行业     |
| size            | 规模     |
| financing_stage | 融资阶段 |
| website         | 官网     |
| risk_signals    | 风险信号 |
| notes           | 备注     |

### job_posting

岗位记录。

| 字段                   | 说明      |
| ---------------------- | --------- |
| id                     | 主键      |
| platform               | 平台      |
| url                    | 岗位链接  |
| title                  | 岗位标题  |
| salary_text            | 薪资原文  |
| city                   | 城市      |
| experience_requirement | 经验要求  |
| education_requirement  | 学历要求  |
| jd_raw                 | 原始 JD   |
| jd_structured          | 结构化 JD |
| company_id             | 公司      |
| recruiter_name         | 招聘者    |
| captured_at            | 采集时间  |

### job_analysis

岗位分析结果。

| 字段                   | 说明        |
| ---------------------- | ----------- |
| id                     | 主键        |
| job_id                 | 岗位        |
| match_score            | 匹配分      |
| recommendation         | 推荐动作    |
| matched_keywords       | 匹配关键词  |
| required_skills        | 必须技能    |
| bonus_skills           | 加分技能    |
| matched_experience_ids | 匹配经历    |
| risk_flags             | 风险点      |
| resume_strategy        | 简历策略    |
| model_name             | 模型        |
| prompt_version         | Prompt 版本 |

### resume_version

简历版本。

| 字段                    | 说明                                   |
| ----------------------- | -------------------------------------- |
| id                      | 主键                                   |
| job_id                  | 对应岗位                               |
| variant                 | quick / formal / technical / interview |
| markdown_content        | Markdown 内容                          |
| selected_experience_ids | 使用经历                               |
| change_summary          | 改写说明                               |
| created_at              | 创建时间                               |

### application

投递记录。

| 字段              | 说明     |
| ----------------- | -------- |
| id                | 主键     |
| job_id            | 岗位     |
| status            | 状态     |
| resume_version_id | 使用简历 |
| greeting_message  | 打招呼语 |
| applied_at        | 投递时间 |
| next_follow_up_at | 下次跟进 |
| outcome           | 结果     |

### application_event

时间线事件。

| 字段           | 说明                                                                  |
| -------------- | --------------------------------------------------------------------- |
| id             | 主键                                                                  |
| application_id | 投递                                                                  |
| type           | captured / greeted / applied / replied / interview / rejected / offer |
| content        | 事件内容                                                              |
| occurred_at    | 发生时间                                                              |

### ai_generation_run

AI 生成请求观测记录。只保存运行元数据，不保存完整 Prompt、简历正文、经历库正文或 JD 正文。

| 字段           | 说明                                               |
| -------------- | -------------------------------------------------- |
| id             | 主键                                               |
| feature        | 能力名，如 job-analysis / resume-generation         |
| status         | provider_success / provider_fallback / rule_based |
| provider_name  | Provider 名称                                      |
| model_name     | 模型名或规则版标识                                 |
| prompt_version | Prompt 版本                                        |
| duration_ms    | 本次生成耗时                                       |
| error_message  | Provider 失败摘要                                  |
| related_job_id | 关联岗位                                           |
| created_at     | 创建时间                                           |

## 规划中表

这些对象仍属于产品架构，但尚未落地为独立表。当前 MVP 用经历库字段、岗位字段和规则逻辑先支撑闭环，避免过早扩展数据模型。

### user_profile

用户求职偏好。

| 字段                 | 说明         |
| -------------------- | ------------ |
| id                   | 主键         |
| target_roles         | 目标岗位     |
| target_cities        | 目标城市     |
| expected_salary_min  | 期望薪资下限 |
| expected_salary_max  | 期望薪资上限 |
| preferred_industries | 偏好行业     |
| blocked_keywords     | 黑名单关键词 |
| automation_level     | 自动化等级   |

### skill_evidence

技能与经历证据。

| 字段                 | 说明           |
| -------------------- | -------------- |
| id                   | 主键           |
| skill                | 技能名称       |
| experience_id        | 对应经历       |
| proof                | 证明材料       |
| depth                | 熟练度         |
| can_interview_deeply | 是否可深入面试 |
