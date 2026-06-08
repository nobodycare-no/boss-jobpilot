import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  BarChart3,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Copy,
  FileText,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle
} from "lucide-react";

import type {
  Application,
  ApplicationEvent,
  ExperienceItem,
  JobAnalysis,
  JobPosting,
  JobPostingCreateInput,
  ResumeVersion
} from "@boss-jobpilot/shared";

import {
  analyzeJob,
  createJob,
  deleteJob,
  generateGreeting,
  generateResume,
  getApplicationEvents,
  getLatestApplication,
  getLatestJobAnalysis,
  getLatestResume,
  listJobs,
  updateApplication
} from "./api";

type JobFormState = {
  platform: string;
  url: string;
  title: string;
  salaryText: string;
  city: string;
  experienceRequirement: string;
  educationRequirement: string;
  companyName: string;
  jdRaw: string;
};

const emptyJobForm: JobFormState = {
  platform: "boss",
  url: "",
  title: "",
  salaryText: "",
  city: "",
  experienceRequirement: "",
  educationRequirement: "",
  companyName: "",
  jdRaw: ""
};

const recommendationLabels: Record<JobAnalysis["recommendation"], string> = {
  prioritize: "优先投递",
  apply: "可以投递",
  cautious: "谨慎投递",
  skip: "建议跳过"
};

const applicationStatusLabels: Record<Application["status"], string> = {
  draft: "草稿",
  greeted: "已打招呼",
  applied: "已投递",
  replied: "已回复",
  interview: "面试中",
  rejected: "已拒绝",
  offer: "Offer",
  closed: "已关闭"
};

type JobBoardStage = "unstarted" | Application["status"];
type JobBoardFilter = "all" | JobBoardStage;

const boardStageLabels: Record<JobBoardStage, string> = {
  unstarted: "未生成草稿",
  ...applicationStatusLabels
};

const boardStageOrder = [
  "unstarted",
  "draft",
  "greeted",
  "applied",
  "replied",
  "interview",
  "offer",
  "rejected",
  "closed"
] satisfies JobBoardStage[];

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

type JobPoolProps = {
  experiences: ExperienceItem[];
};

export function JobPool({ experiences }: JobPoolProps) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [form, setForm] = useState<JobFormState>(emptyJobForm);
  const [analysisByJobId, setAnalysisByJobId] = useState<Record<string, JobAnalysis>>({});
  const [resumeByJobId, setResumeByJobId] = useState<Record<string, ResumeVersion>>({});
  const [applicationByJobId, setApplicationByJobId] = useState<Record<string, Application>>({});
  const [eventsByApplicationId, setEventsByApplicationId] = useState<
    Record<string, ApplicationEvent[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeBoardFilter, setActiveBoardFilter] = useState<JobBoardFilter>("all");

  const jobKeywords = useMemo(
    () =>
      Array.from(
        new Set(
          jobs.flatMap((job) =>
            [job.title, job.companyName, job.city, job.salaryText].filter(
              (value): value is string => Boolean(value)
            )
          )
        )
      ).slice(0, 10),
    [jobs]
  );
  const experienceById = useMemo(
    () => new Map(experiences.map((experience) => [experience.id, experience])),
    [experiences]
  );
  const boardItems = useMemo(() => {
    const counts = new Map<JobBoardStage, number>(
      boardStageOrder.map((stage) => [stage, 0] as const)
    );

    for (const job of jobs) {
      const stage = getJobBoardStage(job.id, applicationByJobId);
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }

    return [
      {
        count: jobs.length,
        label: "全部",
        stage: "all" as const
      },
      ...boardStageOrder.map((stage) => ({
        count: counts.get(stage) ?? 0,
        label: boardStageLabels[stage],
        stage
      }))
    ];
  }, [applicationByJobId, jobs]);
  const visibleJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          activeBoardFilter === "all" ||
          getJobBoardStage(job.id, applicationByJobId) === activeBoardFilter
      ),
    [activeBoardFilter, applicationByJobId, jobs]
  );

  async function refreshJobs() {
    setIsLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await listJobs();
      setJobs(response.items);
      const latestAnalyses = await Promise.all(
        response.items.map(async (job) => {
          const latest = await getLatestJobAnalysis(job.id);
          return [job.id, latest.item] as const;
        })
      );
      const latestResumes = await Promise.all(
        response.items.map(async (job) => {
          const latest = await getLatestResume(job.id);
          return [job.id, latest.item] as const;
        })
      );
      const latestApplications = await Promise.all(
        response.items.map(async (job) => {
          const latest = await getLatestApplication(job.id);
          return [job.id, latest.item] as const;
        })
      );
      const applicationEvents = await Promise.all(
        latestApplications
          .map(([, application]) => application)
          .filter((application): application is Application => Boolean(application))
          .map(async (application) => {
            const events = await getApplicationEvents(application.id);
            return [application.id, events.items] as const;
          })
      );

      setAnalysisByJobId(
        Object.fromEntries(
          latestAnalyses.filter((entry): entry is readonly [string, JobAnalysis] =>
            Boolean(entry[1])
          )
        )
      );
      setResumeByJobId(
        Object.fromEntries(
          latestResumes.filter((entry): entry is readonly [string, ResumeVersion] =>
            Boolean(entry[1])
          )
        )
      );
      setApplicationByJobId(
        Object.fromEntries(
          latestApplications.filter((entry): entry is readonly [string, Application] =>
            Boolean(entry[1])
          )
        )
      );
      setEventsByApplicationId(Object.fromEntries(applicationEvents));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "岗位池加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshJobs();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await createJob(formToInput(form));
      setForm(emptyJobForm);
      await refreshJobs();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "岗位保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setFeedback(null);

    try {
      await deleteJob(id);
      setAnalysisByJobId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setResumeByJobId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setApplicationByJobId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      const applicationId = applicationByJobId[id]?.id;
      if (applicationId) {
        setEventsByApplicationId((current) => {
          const next = { ...current };
          delete next[applicationId];
          return next;
        });
      }
      await refreshJobs();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "岗位删除失败");
    }
  }

  async function handleAnalyze(id: string) {
    setError(null);
    setFeedback(null);

    try {
      const response = await analyzeJob(id);
      setAnalysisByJobId((current) => ({
        ...current,
        [id]: response.analysis
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "岗位分析失败");
    }
  }

  async function handleGenerateResume(id: string) {
    setError(null);
    setFeedback(null);

    try {
      const response = await generateResume(id);
      setResumeByJobId((current) => ({
        ...current,
        [id]: response.item
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "定制简历生成失败");
    }
  }

  async function handleGenerateGreeting(id: string) {
    setError(null);
    setFeedback(null);

    try {
      const response = await generateGreeting(id);
      setApplicationByJobId((current) => ({
        ...current,
        [id]: response.item
      }));
      const events = await getApplicationEvents(response.item.id);
      setEventsByApplicationId((current) => ({
        ...current,
        [response.item.id]: events.items
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "打招呼语生成失败");
    }
  }

  async function handleUpdateApplicationStatus(
    applicationId: string,
    status: Application["status"]
  ) {
    setError(null);
    setFeedback(null);

    try {
      const response = await updateApplication(applicationId, {
        status
      });
      setApplicationByJobId((current) => ({
        ...current,
        [response.item.jobId]: response.item
      }));
      const events = await getApplicationEvents(response.item.id);
      setEventsByApplicationId((current) => ({
        ...current,
        [response.item.id]: events.items
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "投递状态更新失败");
    }
  }

  async function handleCopyText(label: string, value: string) {
    setError(null);
    setFeedback(null);

    try {
      await writeClipboardText(value);
      setFeedback(`${label}已复制`);
    } catch {
      setError("复制失败，请手动选择内容复制");
    }
  }

  return (
    <section className="job-section" aria-label="岗位池">
      {error ? <div className="notice">{error}</div> : null}
      {feedback ? <div className="notice notice--success">{feedback}</div> : null}

      <div className="workspace-grid">
        <form className="editor-panel" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <BriefcaseBusiness size={16} />
                岗位采集
              </p>
              <h2>保存岗位</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              平台
              <input
                required
                value={form.platform}
                onChange={(event) =>
                  setForm((current) => ({ ...current, platform: event.target.value }))
                }
              />
            </label>
            <label>
              城市
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({ ...current, city: event.target.value }))
                }
                placeholder="上海"
              />
            </label>
            <label className="wide">
              岗位标题
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="AI 前端开发工程师"
              />
            </label>
            <label>
              公司
              <input
                value={form.companyName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, companyName: event.target.value }))
                }
                placeholder="示例科技"
              />
            </label>
            <label>
              薪资
              <input
                value={form.salaryText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, salaryText: event.target.value }))
                }
                placeholder="20-35K"
              />
            </label>
            <label>
              经验
              <input
                value={form.experienceRequirement}
                onChange={(event) =>
                  setForm((current) => ({ ...current, experienceRequirement: event.target.value }))
                }
                placeholder="1-3 年"
              />
            </label>
            <label>
              学历
              <input
                value={form.educationRequirement}
                onChange={(event) =>
                  setForm((current) => ({ ...current, educationRequirement: event.target.value }))
                }
                placeholder="本科"
              />
            </label>
            <label className="wide">
              链接
              <input
                value={form.url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, url: event.target.value }))
                }
                placeholder="https://www.zhipin.com/..."
              />
            </label>
            <label className="wide">
              JD
              <textarea
                required
                value={form.jdRaw}
                onChange={(event) =>
                  setForm((current) => ({ ...current, jdRaw: event.target.value }))
                }
                placeholder="粘贴岗位职责和任职要求，用于后续匹配分析。"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSaving}>
              <Plus size={18} />
              {isSaving ? "保存中" : "保存岗位"}
            </button>
            <button type="button" className="secondary-button" onClick={() => void refreshJobs()}>
              <RefreshCw size={18} />
              刷新
            </button>
          </div>
        </form>

        <section className="library-panel" aria-label="岗位列表">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <BriefcaseBusiness size={16} />
                岗位池
              </p>
              <h2>已保存岗位</h2>
            </div>
            <span className="count-pill">
              {visibleJobs.length}/{jobs.length}
            </span>
          </div>

          {jobKeywords.length > 0 ? (
            <div className="skill-strip">
              {jobKeywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          ) : null}

          {jobs.length > 0 ? (
            <div className="application-board" aria-label="投递看板">
              {boardItems.map((item) => (
                <button
                  aria-pressed={activeBoardFilter === item.stage}
                  className="board-filter-button"
                  key={item.stage}
                  onClick={() => setActiveBoardFilter(item.stage)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              ))}
            </div>
          ) : null}

          {isLoading ? <p className="empty-state">正在加载岗位池...</p> : null}
          {!isLoading && jobs.length === 0 ? (
            <p className="empty-state">还没有岗位。先手动保存一个岗位，后续会接入插件采集。</p>
          ) : null}
          {!isLoading && jobs.length > 0 && visibleJobs.length === 0 ? (
            <p className="empty-state">当前投递状态下没有岗位。</p>
          ) : null}

          <div className="experience-list">
            {visibleJobs.map((job) => {
              const application = applicationByJobId[job.id];

              return (
                <JobCard
                  analysis={analysisByJobId[job.id]}
                  application={application}
                  applicationEvents={application ? eventsByApplicationId[application.id] ?? [] : []}
                  experienceById={experienceById}
                  job={job}
                  key={job.id}
                  onAnalyze={handleAnalyze}
                  onDelete={handleDelete}
                  onGenerateGreeting={handleGenerateGreeting}
                  onGenerateResume={handleGenerateResume}
                  onCopyText={handleCopyText}
                  onUpdateApplicationStatus={handleUpdateApplicationStatus}
                  resume={resumeByJobId[job.id]}
                />
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

type JobCardProps = {
  analysis?: JobAnalysis;
  application?: Application;
  applicationEvents: ApplicationEvent[];
  experienceById: Map<string, ExperienceItem>;
  job: JobPosting;
  onAnalyze: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerateGreeting: (id: string) => Promise<void>;
  onGenerateResume: (id: string) => Promise<void>;
  onCopyText: (label: string, value: string) => Promise<void>;
  onUpdateApplicationStatus: (
    applicationId: string,
    status: Application["status"]
  ) => Promise<void>;
  resume?: ResumeVersion;
};

function JobCard({
  analysis,
  application,
  applicationEvents,
  experienceById,
  job,
  onAnalyze,
  onDelete,
  onGenerateGreeting,
  onGenerateResume,
  onCopyText,
  onUpdateApplicationStatus,
  resume
}: JobCardProps) {
  return (
    <article className="experience-card">
      <div className="experience-card__header">
        <div>
          <span className="type-pill">{job.platform}</span>
          <h3>{job.title}</h3>
        </div>
        <div className="card-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => void onAnalyze(job.id)}
            title="分析"
          >
            <BarChart3 size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => void onGenerateResume(job.id)}
            title="生成定制简历"
          >
            <FileText size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => void onGenerateGreeting(job.id)}
            title="生成打招呼语"
          >
            <MessageSquareText size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() =>
              void onCopyText(
                "投递包",
                buildApplicationPackage({
                  analysis,
                  application,
                  events: applicationEvents,
                  experienceById,
                  job,
                  resume
                })
              )
            }
            title="复制投递包"
          >
            <Copy size={17} />
          </button>
          <button
            type="button"
            className="icon-button danger"
            onClick={() => void onDelete(job.id)}
            title="删除"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <p className="experience-meta">
        {[job.companyName, job.city, job.salaryText, job.experienceRequirement]
          .filter(Boolean)
          .join(" / ")}
      </p>
      <p>{job.jdRaw}</p>
      {analysis ? <AnalysisPanel analysis={analysis} experienceById={experienceById} /> : null}
      {resume ? <ResumePanel resume={resume} onCopyText={onCopyText} /> : null}
      {application ? (
        <ApplicationPanel
          application={application}
          events={applicationEvents}
          onCopyText={onCopyText}
          onUpdateStatus={onUpdateApplicationStatus}
        />
      ) : null}
    </article>
  );
}

function ApplicationPanel({
  application,
  events,
  onCopyText,
  onUpdateStatus
}: {
  application: Application;
  events: ApplicationEvent[];
  onCopyText: (label: string, value: string) => Promise<void>;
  onUpdateStatus: (applicationId: string, status: Application["status"]) => Promise<void>;
}) {
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
          <span>{applicationStatusLabels[application.status]}</span>
        </div>
      </div>
      <p>{application.greetingMessage}</p>
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
      {application.appliedAt ? <small>投递时间：{formatDateTime(application.appliedAt)}</small> : null}
      {events.length > 0 ? <ApplicationTimeline events={events} /> : null}
    </div>
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

function ResumePanel({
  resume,
  onCopyText
}: {
  resume: ResumeVersion;
  onCopyText: (label: string, value: string) => Promise<void>;
}) {
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
          <span>{resume.variant}</span>
        </div>
      </div>
      {resume.changeSummary ? <p>{resume.changeSummary}</p> : null}
      <pre>{resume.markdownContent}</pre>
    </div>
  );
}

function AnalysisPanel({
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

function buildApplicationPackage({
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
        ["下次跟进", application.nextFollowUpAt ? formatDateTime(application.nextFollowUpAt) : undefined],
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

function formToInput(form: JobFormState): JobPostingCreateInput {
  return {
    platform: form.platform.trim(),
    url: optionalText(form.url),
    title: form.title.trim(),
    salaryText: optionalText(form.salaryText),
    city: optionalText(form.city),
    experienceRequirement: optionalText(form.experienceRequirement),
    educationRequirement: optionalText(form.educationRequirement),
    companyName: optionalText(form.companyName),
    jdRaw: form.jdRaw.trim()
  };
}

function optionalText(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

function getJobBoardStage(
  jobId: string,
  applicationByJobId: Record<string, Application>
): JobBoardStage {
  return applicationByJobId[jobId]?.status ?? "unstarted";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
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

async function writeClipboardText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("Clipboard fallback failed");
    }
  } finally {
    textarea.remove();
  }
}
