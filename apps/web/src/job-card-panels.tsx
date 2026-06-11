import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  Copy,
  MessageSquareText,
  Send,
  Trash2,
  XCircle
} from "lucide-react";

import type {
  Application,
  ApplicationEvent,
  ExperienceItem,
  GreetingVariant,
  JobAnalysis,
  JobPosting,
  ResumeVersion
} from "@boss-jobpilot/shared";

import { applicationStatusLabels, recommendationLabels } from "./job-labels";

const applicationStatusActions = [
  { status: "greeted", label: "已打招呼", Icon: CheckCircle2 },
  { status: "applied", label: "已投递", Icon: Send },
  { status: "replied", label: "已回复", Icon: MessageSquareText },
  { status: "interview", label: "面试", Icon: CalendarCheck },
  { status: "offer", label: "Offer", Icon: BadgeCheck },
  { status: "rejected", label: "已拒绝", Icon: XCircle },
  { status: "closed", label: "关闭", Icon: Trash2 }
] satisfies Array<{
  status: Application["status"];
  label: string;
  Icon: typeof CheckCircle2;
}>;

export function ApplicationPanel({
  application,
  events,
  onCopyText,
  onSaveEdit,
  onUpdateFollowUp,
  onUpdateStatus
}: {
  application: Application;
  events: ApplicationEvent[];
  onCopyText: (label: string, value: string) => Promise<void>;
  onSaveEdit: (applicationId: string, greetingMessage: string) => Promise<void>;
  onUpdateFollowUp: (applicationId: string, nextFollowUpAt: string | null) => Promise<void>;
  onUpdateStatus: (applicationId: string, status: Application["status"]) => Promise<void>;
}) {
  const followUpInputValue = application.nextFollowUpAt
    ? toDateTimeLocalValue(application.nextFollowUpAt)
    : "";
  const followUpInputRef = useRef<HTMLInputElement>(null);
  const greetingInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (followUpInputRef.current) {
      followUpInputRef.current.value = followUpInputValue;
    }
  }, [followUpInputValue]);

  useEffect(() => {
    if (greetingInputRef.current) {
      greetingInputRef.current.value = application.greetingMessage;
    }
  }, [application.greetingMessage]);

  return (
    <div className="application-box">
      <div className="application-box__header">
        <strong>打招呼语草稿</strong>
        <div className="panel-actions">
          <button
            type="button"
            className="panel-action-button"
            onClick={() => void onCopyText("打招呼语", application.greetingMessage)}
          >
            <Copy size={15} />
            复制
          </button>
          <span>
            {formatGreetingVariant(application.greetingVariant)} ·{" "}
            {applicationStatusLabels[application.status]}
          </span>
        </div>
      </div>
      <p>{application.greetingMessage}</p>
      <div className="draft-editor">
        <label>
          编辑打招呼语
          <textarea defaultValue={application.greetingMessage} ref={greetingInputRef} rows={4} />
        </label>
        <div className="draft-editor__actions">
          <button
            type="button"
            className="panel-action-button"
            onClick={() =>
              void onSaveEdit(application.id, greetingInputRef.current?.value.trim() ?? "")
            }
          >
            保存话术
          </button>
        </div>
      </div>
      <div className="application-actions">
        {applicationStatusActions.map(({ status, label, Icon }) => (
          <button
            key={status}
            type="button"
            className="status-button"
            disabled={application.status === status}
            onClick={() => void onUpdateStatus(application.id, status)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      {application.resumeVersionId ? (
        <small>已关联简历版本：{application.resumeVersionId}</small>
      ) : null}
      {application.appliedAt ? (
        <small>投递时间：{formatDateTime(application.appliedAt)}</small>
      ) : null}
      <div className="follow-up-row">
        <label>
          下次跟进
          <input defaultValue={followUpInputValue} ref={followUpInputRef} type="datetime-local" />
        </label>
        <button
          type="button"
          className="panel-action-button"
          onClick={() =>
            void onUpdateFollowUp(
              application.id,
              followUpInputRef.current?.value
                ? new Date(followUpInputRef.current.value).toISOString()
                : null
            )
          }
        >
          保存
        </button>
        {application.nextFollowUpAt ? (
          <button
            type="button"
            className="panel-action-button"
            onClick={() => void onUpdateFollowUp(application.id, null)}
          >
            清除
          </button>
        ) : null}
      </div>
      {events.length > 0 ? <ApplicationTimeline events={events} /> : null}
    </div>
  );
}

export function VersionComparePanel({
  applications,
  onCopyText,
  resumes
}: {
  applications: Application[];
  onCopyText: (label: string, value: string) => Promise<void>;
  resumes: ResumeVersion[];
}) {
  const [latestResume, previousResume] = resumes;
  const [latestApplication, previousApplication] = applications;

  if (!previousResume && !previousApplication) {
    return null;
  }

  return (
    <div className="version-box">
      <div className="version-box__header">
        <strong>版本对比</strong>
        <span>
          简历 {resumes.length} / 话术 {applications.length}
        </span>
      </div>

      {previousResume && latestResume ? (
        <VersionPair
          latest={{
            actions: (
              <button
                className="panel-action-button"
                onClick={() => void onCopyText("最新 Markdown 简历", latestResume.markdownContent)}
                type="button"
              >
                <Copy size={15} />
                复制
              </button>
            ),
            body: [
              latestResume.variant,
              latestResume.changeSummary,
              `${latestResume.markdownContent.length} 字符`,
              `经历：${latestResume.selectedExperienceIds.length}`
            ]
              .filter(Boolean)
              .join(" · "),
            title: `最新简历 · ${formatDateTime(latestResume.createdAt)}`
          }}
          previous={{
            actions: (
              <button
                className="panel-action-button"
                onClick={() =>
                  void onCopyText("上一版 Markdown 简历", previousResume.markdownContent)
                }
                type="button"
              >
                <Copy size={15} />
                复制
              </button>
            ),
            body: [
              previousResume.variant,
              previousResume.changeSummary,
              `${previousResume.markdownContent.length} 字符`,
              `经历：${previousResume.selectedExperienceIds.length}`
            ]
              .filter(Boolean)
              .join(" · "),
            title: `上一版简历 · ${formatDateTime(previousResume.createdAt)}`
          }}
        />
      ) : null}

      {previousApplication && latestApplication ? (
        <VersionPair
          latest={{
            actions: (
              <button
                className="panel-action-button"
                onClick={() => void onCopyText("最新打招呼语", latestApplication.greetingMessage)}
                type="button"
              >
                <Copy size={15} />
                复制
              </button>
            ),
            body: [
              formatGreetingVariant(latestApplication.greetingVariant),
              compactText(latestApplication.greetingMessage)
            ].join(" · "),
            title: `最新话术 · ${applicationStatusLabels[latestApplication.status]} · ${formatDateTime(
              latestApplication.updatedAt
            )}`
          }}
          previous={{
            actions: (
              <button
                className="panel-action-button"
                onClick={() =>
                  void onCopyText("上一版打招呼语", previousApplication.greetingMessage)
                }
                type="button"
              >
                <Copy size={15} />
                复制
              </button>
            ),
            body: [
              formatGreetingVariant(previousApplication.greetingVariant),
              compactText(previousApplication.greetingMessage)
            ].join(" · "),
            title: `上一版话术 · ${
              applicationStatusLabels[previousApplication.status]
            } · ${formatDateTime(previousApplication.updatedAt)}`
          }}
        />
      ) : null}
    </div>
  );
}

function VersionPair({
  latest,
  previous
}: {
  latest: { actions: ReactNode; body: string; title: string };
  previous: { actions: ReactNode; body: string; title: string };
}) {
  return (
    <div className="version-pair">
      <VersionSnapshot {...latest} />
      <VersionSnapshot {...previous} />
    </div>
  );
}

function VersionSnapshot({
  actions,
  body,
  title
}: {
  actions: ReactNode;
  body: string;
  title: string;
}) {
  return (
    <article className="version-snapshot">
      <div>
        <strong>{title}</strong>
        {actions}
      </div>
      <p>{body || "暂无摘要"}</p>
    </article>
  );
}

function ApplicationTimeline({ events }: { events: ApplicationEvent[] }) {
  return (
    <div className="application-timeline">
      <strong>状态时间线</strong>
      <ol>
        {events.map((event) => (
          <li key={event.id}>
            <span>{formatDateTime(event.occurredAt)}</span>
            <p>{formatApplicationEvent(event)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ResumePanel({
  resume,
  onCopyText,
  onSaveEdit
}: {
  resume: ResumeVersion;
  onCopyText: (label: string, value: string) => Promise<void>;
  onSaveEdit: (resume: ResumeVersion, markdownContent: string) => Promise<void>;
}) {
  const [markdownContent, setMarkdownContent] = useState(resume.markdownContent);
  const hasEditedMarkdown = markdownContent.trim() !== resume.markdownContent.trim();

  useEffect(() => {
    setMarkdownContent(resume.markdownContent);
  }, [resume.markdownContent]);

  return (
    <div className="resume-box">
      <div className="resume-box__header">
        <strong>定制简历草稿</strong>
        <div className="panel-actions">
          <button
            type="button"
            className="panel-action-button"
            onClick={() => void onCopyText("Markdown 简历", resume.markdownContent)}
          >
            <Copy size={15} />
            复制
          </button>
          <span>{resume.variant} · 已自动保存</span>
        </div>
      </div>
      {resume.changeSummary ? <p>{resume.changeSummary}</p> : null}
      <pre>{resume.markdownContent}</pre>
      <div className="draft-editor">
        <label>
          编辑 Markdown 简历
          <textarea
            onChange={(event) => setMarkdownContent(event.target.value)}
            rows={10}
            value={markdownContent}
          />
        </label>
        <div className="draft-editor__actions">
          <button
            type="button"
            className="panel-action-button"
            disabled={!hasEditedMarkdown}
            onClick={() => void onSaveEdit(resume, markdownContent.trim())}
          >
            保存编辑为新版本
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnalysisPanel({
  analysis,
  experienceById
}: {
  analysis: JobAnalysis;
  experienceById: Map<string, ExperienceItem>;
}) {
  return (
    <div className="analysis-box">
      <div className="analysis-score">
        <strong>{analysis.matchScore}/100</strong>
        <span>{recommendationLabels[analysis.recommendation]}</span>
      </div>
      <div className="analysis-grid">
        <AnalysisList label="匹配关键词" values={analysis.matchedKeywords} />
        <AnalysisList label="必需技能" values={analysis.requiredSkills} />
        <AnalysisList label="加分技能" values={analysis.bonusSkills} />
        <AnalysisList label="风险信号" values={analysis.riskFlags} />
      </div>
      <MatchedExperienceList ids={analysis.matchedExperienceIds} experienceById={experienceById} />
      <p className="analysis-strategy">{analysis.resumeStrategy}</p>
    </div>
  );
}

function MatchedExperienceList({
  ids,
  experienceById
}: {
  ids: string[];
  experienceById: Map<string, ExperienceItem>;
}) {
  if (ids.length === 0) {
    return null;
  }

  return (
    <div className="matched-experience-list">
      <span>匹配经历</span>
      <div>
        {ids.map((id) => {
          const experience = experienceById.get(id);

          if (!experience) {
            return <small key={id}>{id}</small>;
          }

          return (
            <article className="matched-experience-card" key={id}>
              <strong>{experience.title}</strong>
              {experience.summary ? <p>{experience.summary}</p> : null}
              {experience.techStack.length > 0 ? (
                <small>{experience.techStack.slice(0, 6).join("、")}</small>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AnalysisList({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="analysis-list">
      <span>{label}</span>
      <small>{values.join("、")}</small>
    </div>
  );
}

export function buildApplicationPackage({
  analysis,
  application,
  events,
  experienceById,
  job,
  resume
}: {
  analysis?: JobAnalysis;
  application?: Application;
  events: ApplicationEvent[];
  experienceById: Map<string, ExperienceItem>;
  job: JobPosting;
  resume?: ResumeVersion;
}) {
  const sections = [
    `# ${job.title} - 投递包`,
    formatPackageSection("岗位信息", [
      ["平台", job.platform],
      ["公司", job.companyName],
      ["城市", job.city],
      ["薪资", job.salaryText],
      ["经验", job.experienceRequirement],
      ["学历", job.educationRequirement],
      ["链接", job.url],
      ["采集时间", formatDateTime(job.capturedAt)]
    ]),
    `## JD\n\n${job.jdRaw || "未填写"}`
  ];

  if (analysis) {
    sections.push(
      formatPackageSection("岗位分析", [
        ["匹配分", `${analysis.matchScore}/100`],
        ["投递建议", recommendationLabels[analysis.recommendation]],
        ["匹配关键词", formatList(analysis.matchedKeywords)],
        ["必需技能", formatList(analysis.requiredSkills)],
        ["加分技能", formatList(analysis.bonusSkills)],
        ["风险信号", formatList(analysis.riskFlags)],
        ["简历策略", analysis.resumeStrategy],
        ["分析时间", formatDateTime(analysis.createdAt)]
      ])
    );

    const matchedExperiences = analysis.matchedExperienceIds
      .map((id) => formatPackageExperience(id, experienceById.get(id)))
      .join("\n\n");

    sections.push(`## 匹配经历\n\n${matchedExperiences || "暂无匹配经历"}`);
  } else {
    sections.push("## 岗位分析\n\n尚未生成岗位分析。");
  }

  if (resume) {
    sections.push(
      formatPackageSection("定制简历元信息", [
        ["版本", resume.variant],
        ["生成时间", formatDateTime(resume.createdAt)],
        ["选用经历", formatList(resume.selectedExperienceIds)],
        ["变更摘要", resume.changeSummary]
      ]),
      `## Markdown 简历\n\n${resume.markdownContent}`
    );
  } else {
    sections.push("## Markdown 简历\n\n尚未生成定制简历。");
  }

  if (application) {
    sections.push(
      formatPackageSection("打招呼语与投递状态", [
        ["状态", applicationStatusLabels[application.status]],
        ["创建时间", formatDateTime(application.createdAt)],
        ["更新时间", formatDateTime(application.updatedAt)],
        ["投递时间", application.appliedAt ? formatDateTime(application.appliedAt) : undefined],
        [
          "下次跟进",
          application.nextFollowUpAt ? formatDateTime(application.nextFollowUpAt) : undefined
        ],
        ["结果", application.outcome],
        ["关联简历版本", application.resumeVersionId]
      ]),
      `## 打招呼语\n\n${application.greetingMessage || "暂无打招呼语"}`
    );

    if (events.length > 0) {
      sections.push(
        `## 状态时间线\n\n${events
          .map((event) => `- ${formatDateTime(event.occurredAt)}：${formatApplicationEvent(event)}`)
          .join("\n")}`
      );
    }
  } else {
    sections.push("## 打招呼语与投递状态\n\n尚未生成打招呼语草稿。");
  }

  return sections.join("\n\n");
}

function formatPackageSection(title: string, rows: Array<[string, string | undefined]>) {
  const body = rows
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `- ${label}：${value}`)
    .join("\n");

  return `## ${title}\n\n${body || "暂无信息"}`;
}

function formatPackageExperience(id: string, experience?: ExperienceItem) {
  if (!experience) {
    return `### ${id}\n\n素材已不存在。`;
  }

  return [
    `### ${experience.title}`,
    formatPackageSection("经历详情", [
      ["类型", experience.type],
      ["组织", experience.organization],
      ["角色", experience.role],
      ["时间", [experience.startDate, experience.endDate].filter(Boolean).join(" - ")],
      ["负责程度", experience.ownershipLevel],
      ["真实性", experience.evidenceLevel],
      ["技术栈", formatList(experience.techStack)],
      ["摘要", experience.summary],
      ["职责", formatList(experience.responsibilities)],
      ["成果", formatList(experience.achievements)]
    ])
  ].join("\n\n");
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join("、") : undefined;
}

function compactText(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function formatGreetingVariant(variant: GreetingVariant) {
  const labels = {
    direct: "主动版",
    evidence: "证据版",
    polite: "礼貌版"
  } satisfies Record<GreetingVariant, string>;

  return labels[variant];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function formatApplicationEvent(event: ApplicationEvent) {
  if (event.type === "status_changed" && event.content) {
    try {
      const payload = JSON.parse(event.content) as Partial<{
        from: Application["status"];
        to: Application["status"];
      }>;

      if (payload.from && payload.to) {
        return `状态从 ${applicationStatusLabels[payload.from]} 更新为 ${
          applicationStatusLabels[payload.to]
        }`;
      }
    } catch {
      return event.content;
    }
  }

  if (event.content) {
    return event.content;
  }

  return event.type;
}
