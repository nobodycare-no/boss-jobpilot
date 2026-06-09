import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

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
  Timer,
  TrendingUp,
  Trash2,
  XCircle
} from "lucide-react";

import type {
  Application,
  ApplicationEvent,
  ApplicationReviewStrategyRecap,
  AiGenerationRun,
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
  generateApplicationReviewStrategy,
  generateGreeting,
  generateResume,
  getAiProviderHealth,
  getApplicationEvents,
  getLatestApplication,
  getLatestJobAnalysis,
  getLatestResume,
  listApplications,
  listAiGenerationRuns,
  listJobs,
  listResumes,
  type AiProviderHealth,
  type ApiWarning,
  updateApplication
} from "./api";
import {
  buildApplicationReviewStrategyRequest,
  buildApplicationReviewSummary,
  defaultApplicationReviewFilters,
  filterApplicationReviewJobs,
  formatReviewRate,
  getApplicationReviewCityLabel,
  type ApplicationReviewAttributionGroup,
  type ApplicationReviewDistributionItem,
  type ApplicationReviewFilters,
  type ApplicationReviewRecommendationFilter,
  type ApplicationReviewStatusFilter,
  type ApplicationReviewStrategySuggestion,
  type ApplicationReviewSummary
} from "./application-review";

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

const recommendationOrder = ["prioritize", "apply", "cautious", "skip"] satisfies Array<
  JobAnalysis["recommendation"]
>;

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
type FollowUpFilter = "followUpDue" | "followUpOverdue" | "followUpToday" | "followUpUpcoming";
type JobBoardFilter = "all" | FollowUpFilter | JobBoardStage;
type FollowUpBucket = "overdue" | "today" | "upcoming" | "none";

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

const followUpFilterItems = [
  { filter: "followUpDue", label: "今日待跟进" },
  { filter: "followUpOverdue", label: "逾期" },
  { filter: "followUpToday", label: "今天" },
  { filter: "followUpUpcoming", label: "未来 3 天" }
] satisfies Array<{
  filter: FollowUpFilter;
  label: string;
}>;

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
  const [resumeHistoryByJobId, setResumeHistoryByJobId] = useState<Record<string, ResumeVersion[]>>(
    {}
  );
  const [applicationByJobId, setApplicationByJobId] = useState<Record<string, Application>>({});
  const [applicationHistoryByJobId, setApplicationHistoryByJobId] = useState<
    Record<string, Application[]>
  >({});
  const [eventsByApplicationId, setEventsByApplicationId] = useState<
    Record<string, ApplicationEvent[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [aiProviderHealth, setAiProviderHealth] = useState<AiProviderHealth | null>(null);
  const [aiProviderHealthError, setAiProviderHealthError] = useState<string | null>(null);
  const [isAiProviderHealthLoading, setIsAiProviderHealthLoading] = useState(false);
  const [aiGenerationRuns, setAiGenerationRuns] = useState<AiGenerationRun[]>([]);
  const [activeBoardFilter, setActiveBoardFilter] = useState<JobBoardFilter>("all");
  const [reviewFilters, setReviewFilters] = useState<ApplicationReviewFilters>(
    defaultApplicationReviewFilters
  );
  const [strategyRecap, setStrategyRecap] = useState<ApplicationReviewStrategyRecap | null>(null);
  const [isStrategyRecapLoading, setIsStrategyRecapLoading] = useState(false);
  const [strategyRecapError, setStrategyRecapError] = useState<string | null>(null);

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
  const followUpItems = useMemo(() => {
    const counts = {
      followUpDue: 0,
      followUpOverdue: 0,
      followUpToday: 0,
      followUpUpcoming: 0
    } satisfies Record<FollowUpFilter, number>;

    for (const job of jobs) {
      const bucket = getFollowUpBucket(applicationByJobId[job.id]?.nextFollowUpAt);

      if (bucket === "overdue") {
        counts.followUpDue += 1;
        counts.followUpOverdue += 1;
      }

      if (bucket === "today") {
        counts.followUpDue += 1;
        counts.followUpToday += 1;
      }

      if (bucket === "upcoming") {
        counts.followUpUpcoming += 1;
      }
    }

    return followUpFilterItems.map((item) => ({
      count: counts[item.filter],
      ...item
    }));
  }, [applicationByJobId, jobs]);
  const reviewCityOptions = useMemo(
    () =>
      Array.from(new Set(jobs.map(getApplicationReviewCityLabel))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [jobs]
  );
  const reviewJobs = useMemo(
    () =>
      filterApplicationReviewJobs({
        analysisByJobId,
        applicationByJobId,
        filters: reviewFilters,
        jobs
      }),
    [analysisByJobId, applicationByJobId, jobs, reviewFilters]
  );
  const reviewSummary = useMemo(
    () =>
      buildApplicationReviewSummary({
        analysisByJobId,
        applicationByJobId,
        applicationHistoryByJobId,
        jobs: reviewJobs,
        recommendationLabels,
        resumeHistoryByJobId
      }),
    [
      analysisByJobId,
      applicationByJobId,
      applicationHistoryByJobId,
      resumeHistoryByJobId,
      reviewJobs
    ]
  );
  const reviewScopeLabel = useMemo(() => buildReviewScopeLabel(reviewFilters), [reviewFilters]);
  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (activeBoardFilter === "all") {
          return true;
        }

        if (activeBoardFilter === "followUpDue") {
          return isFollowUpDue(applicationByJobId[job.id]?.nextFollowUpAt);
        }

        if (activeBoardFilter === "followUpOverdue") {
          return getFollowUpBucket(applicationByJobId[job.id]?.nextFollowUpAt) === "overdue";
        }

        if (activeBoardFilter === "followUpToday") {
          return getFollowUpBucket(applicationByJobId[job.id]?.nextFollowUpAt) === "today";
        }

        if (activeBoardFilter === "followUpUpcoming") {
          return getFollowUpBucket(applicationByJobId[job.id]?.nextFollowUpAt) === "upcoming";
        }

        return getJobBoardStage(job.id, applicationByJobId) === activeBoardFilter;
      }),
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
      const resumeHistories = await Promise.all(
        response.items.map(async (job) => {
          const history = await listResumes(job.id);
          return [job.id, history.items] as const;
        })
      );
      const latestApplications = await Promise.all(
        response.items.map(async (job) => {
          const latest = await getLatestApplication(job.id);
          return [job.id, latest.item] as const;
        })
      );
      const applicationHistories = await Promise.all(
        response.items.map(async (job) => {
          const history = await listApplications(job.id);
          return [job.id, history.items] as const;
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
      setResumeHistoryByJobId(Object.fromEntries(resumeHistories));
      setApplicationByJobId(
        Object.fromEntries(
          latestApplications.filter((entry): entry is readonly [string, Application] =>
            Boolean(entry[1])
          )
        )
      );
      setApplicationHistoryByJobId(Object.fromEntries(applicationHistories));
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

  async function refreshAiProviderHealth() {
    setIsAiProviderHealthLoading(true);
    setAiProviderHealthError(null);

    try {
      setAiProviderHealth(await getAiProviderHealth());
    } catch (caughtError) {
      setAiProviderHealthError(
        caughtError instanceof Error ? caughtError.message : "无法检查 AI Provider 状态"
      );
    } finally {
      setIsAiProviderHealthLoading(false);
    }
  }

  async function refreshAiGenerationRuns() {
    try {
      const response = await listAiGenerationRuns();
      setAiGenerationRuns(response.items);
    } catch {
      setAiGenerationRuns([]);
    }
  }

  useEffect(() => {
    void refreshAiProviderHealth();
    void refreshAiGenerationRuns();
  }, []);

  useEffect(() => {
    if (jobs.length === 0) {
      setStrategyRecap(null);
      setStrategyRecapError(null);
      setIsStrategyRecapLoading(false);
      return;
    }

    let isCancelled = false;

    setIsStrategyRecapLoading(true);
    setStrategyRecapError(null);

    void generateApplicationReviewStrategy(
      buildApplicationReviewStrategyRequest(reviewSummary, reviewScopeLabel)
    )
      .then((response) => {
        if (!isCancelled) {
          setStrategyRecap(response.item);
          setStrategyRecapError(formatApiWarnings(response.warnings));
          void refreshAiGenerationRuns();
        }
      })
      .catch((caughtError) => {
        if (!isCancelled) {
          setStrategyRecap(null);
          setStrategyRecapError(
            caughtError instanceof Error ? caughtError.message : "无法生成 AI 策略复盘"
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsStrategyRecapLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [jobs.length, reviewScopeLabel, reviewSummary]);

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
      setResumeHistoryByJobId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setApplicationByJobId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setApplicationHistoryByJobId((current) => {
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
      setFeedback(formatApiWarnings(response.warnings));
      void refreshAiGenerationRuns();
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
      const history = await listResumes(id);
      setResumeHistoryByJobId((current) => ({
        ...current,
        [id]: history.items
      }));
      setFeedback(formatApiWarnings(response.warnings));
      void refreshAiGenerationRuns();
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
      const history = await listApplications(id);
      setApplicationHistoryByJobId((current) => ({
        ...current,
        [id]: history.items
      }));
      const events = await getApplicationEvents(response.item.id);
      setEventsByApplicationId((current) => ({
        ...current,
        [response.item.id]: events.items
      }));
      setFeedback(formatApiWarnings(response.warnings));
      void refreshAiGenerationRuns();
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
      const history = await listApplications(response.item.jobId);
      setApplicationHistoryByJobId((current) => ({
        ...current,
        [response.item.jobId]: history.items
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

  async function handleUpdateApplicationFollowUp(
    applicationId: string,
    nextFollowUpAt: string | null
  ) {
    setError(null);
    setFeedback(null);

    try {
      const response = await updateApplication(applicationId, {
        nextFollowUpAt
      });
      setApplicationByJobId((current) => ({
        ...current,
        [response.item.jobId]: response.item
      }));
      const history = await listApplications(response.item.jobId);
      setApplicationHistoryByJobId((current) => ({
        ...current,
        [response.item.jobId]: history.items
      }));
      setFeedback(nextFollowUpAt ? "下次跟进时间已更新" : "下次跟进时间已清除");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "跟进时间更新失败");
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
            <ApplicationReviewPanel
              aiGenerationRuns={aiGenerationRuns.slice(0, 5)}
              aiProviderHealth={aiProviderHealth}
              aiProviderHealthError={aiProviderHealthError}
              cityOptions={reviewCityOptions}
              filters={reviewFilters}
              isAiProviderHealthLoading={isAiProviderHealthLoading}
              isStrategyRecapLoading={isStrategyRecapLoading}
              onFiltersChange={setReviewFilters}
              onRefreshAiProviderHealth={refreshAiProviderHealth}
              strategyRecap={strategyRecap}
              strategyRecapError={strategyRecapError}
              summary={reviewSummary}
              totalJobs={jobs.length}
            />
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

          {jobs.length > 0 ? (
            <div className="follow-up-board" aria-label="跟进队列">
              {followUpItems.map((item) => (
                <button
                  aria-pressed={activeBoardFilter === item.filter}
                  className="board-filter-button follow-up-filter-button"
                  key={item.filter}
                  onClick={() => setActiveBoardFilter(item.filter)}
                  type="button"
                >
                  <span>
                    <Timer size={13} />
                    {item.label}
                  </span>
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
            <p className="empty-state">
              {isFollowUpFilter(activeBoardFilter)
                ? "当前跟进队列下没有岗位。"
                : "当前投递状态下没有岗位。"}
            </p>
          ) : null}

          <div className="experience-list">
            {visibleJobs.map((job) => {
              const application = applicationByJobId[job.id];

              return (
                <JobCard
                  analysis={analysisByJobId[job.id]}
                  application={application}
                  applicationEvents={
                    application ? (eventsByApplicationId[application.id] ?? []) : []
                  }
                  applicationHistory={applicationHistoryByJobId[job.id] ?? []}
                  experienceById={experienceById}
                  job={job}
                  key={job.id}
                  onAnalyze={handleAnalyze}
                  onDelete={handleDelete}
                  onGenerateGreeting={handleGenerateGreeting}
                  onGenerateResume={handleGenerateResume}
                  onCopyText={handleCopyText}
                  onUpdateFollowUp={handleUpdateApplicationFollowUp}
                  onUpdateApplicationStatus={handleUpdateApplicationStatus}
                  resume={resumeByJobId[job.id]}
                  resumeHistory={resumeHistoryByJobId[job.id] ?? []}
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
  applicationHistory: Application[];
  experienceById: Map<string, ExperienceItem>;
  job: JobPosting;
  onAnalyze: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerateGreeting: (id: string) => Promise<void>;
  onGenerateResume: (id: string) => Promise<void>;
  onCopyText: (label: string, value: string) => Promise<void>;
  onUpdateFollowUp: (applicationId: string, nextFollowUpAt: string | null) => Promise<void>;
  onUpdateApplicationStatus: (
    applicationId: string,
    status: Application["status"]
  ) => Promise<void>;
  resume?: ResumeVersion;
  resumeHistory: ResumeVersion[];
};

function JobCard({
  analysis,
  application,
  applicationEvents,
  applicationHistory,
  experienceById,
  job,
  onAnalyze,
  onDelete,
  onGenerateGreeting,
  onGenerateResume,
  onCopyText,
  onUpdateFollowUp,
  onUpdateApplicationStatus,
  resume,
  resumeHistory
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
          onUpdateFollowUp={onUpdateFollowUp}
          onUpdateStatus={onUpdateApplicationStatus}
        />
      ) : null}
      <VersionComparePanel
        applications={applicationHistory}
        onCopyText={onCopyText}
        resumes={resumeHistory}
      />
    </article>
  );
}

function ApplicationReviewPanel({
  aiGenerationRuns,
  aiProviderHealth,
  aiProviderHealthError,
  cityOptions,
  filters,
  isAiProviderHealthLoading,
  isStrategyRecapLoading,
  onFiltersChange,
  onRefreshAiProviderHealth,
  strategyRecap,
  strategyRecapError,
  summary,
  totalJobs
}: {
  aiGenerationRuns: AiGenerationRun[];
  aiProviderHealth: AiProviderHealth | null;
  aiProviderHealthError: string | null;
  cityOptions: string[];
  filters: ApplicationReviewFilters;
  isAiProviderHealthLoading: boolean;
  isStrategyRecapLoading: boolean;
  onFiltersChange: (filters: ApplicationReviewFilters) => void;
  onRefreshAiProviderHealth: () => void;
  strategyRecap: ApplicationReviewStrategyRecap | null;
  strategyRecapError: string | null;
  summary: ApplicationReviewSummary;
  totalJobs: number;
}) {
  const denominator = summary.statusTotal || summary.totalJobs;
  const isFiltered =
    filters.city !== defaultApplicationReviewFilters.city ||
    filters.recommendation !== defaultApplicationReviewFilters.recommendation ||
    filters.status !== defaultApplicationReviewFilters.status;
  const metrics = [
    {
      detail: `${summary.appliedOrBeyond}/${denominator} 个岗位已推进到投递后`,
      label: "投递推进率",
      value: formatReviewRate(summary.appliedOrBeyond, denominator)
    },
    {
      detail: `${summary.replyCount}/${summary.appliedOrBeyond} 个已投递岗位有回复`,
      label: "回复率",
      value: formatReviewRate(summary.replyCount, summary.appliedOrBeyond)
    },
    {
      detail: `${summary.interviewOrOffer}/${summary.appliedOrBeyond} 个已投递岗位进入面试或 Offer`,
      label: "面试转化",
      value: formatReviewRate(summary.interviewOrOffer, summary.appliedOrBeyond)
    },
    {
      detail:
        summary.averageMatchScore === undefined
          ? "暂无岗位分析"
          : `${summary.generatedPackages} 个岗位已有简历草稿`,
      label: "平均匹配分",
      value: summary.averageMatchScore === undefined ? "-" : `${summary.averageMatchScore}/100`
    }
  ];
  const alerts = [
    summary.overdueFollowUps > 0 ? `${summary.overdueFollowUps} 个岗位跟进已逾期` : undefined,
    summary.staleActiveApplications > 0
      ? `${summary.staleActiveApplications} 个推进中岗位未设置下次跟进`
      : undefined
  ].filter((alert): alert is string => Boolean(alert));

  return (
    <section className="review-panel" aria-label="投递复盘">
      <div className="review-panel__header">
        <div>
          <p className="eyebrow">
            <TrendingUp size={16} />
            投递复盘
          </p>
          <h3>效果概览</h3>
        </div>
        <span>
          {summary.totalJobs}/{totalJobs} 个岗位纳入复盘 · {summary.activeApplications} 个已生成话术
        </span>
      </div>

      <AiProviderHealthCard
        error={aiProviderHealthError}
        health={aiProviderHealth}
        isLoading={isAiProviderHealthLoading}
        onRefresh={onRefreshAiProviderHealth}
      />

      <AiGenerationRunList runs={aiGenerationRuns} />

      <div className="review-controls" aria-label="复盘筛选">
        <label>
          状态
          <select
            value={filters.status}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: event.target.value as ApplicationReviewStatusFilter
              })
            }
          >
            <option value="all">全部状态</option>
            {boardStageOrder.map((stage) => (
              <option key={stage} value={stage}>
                {boardStageLabels[stage]}
              </option>
            ))}
          </select>
        </label>
        <label>
          投递建议
          <select
            value={filters.recommendation}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                recommendation: event.target.value as ApplicationReviewRecommendationFilter
              })
            }
          >
            <option value="all">全部建议</option>
            <option value="unanalyzed">未分析</option>
            {recommendationOrder.map((recommendation) => (
              <option key={recommendation} value={recommendation}>
                {recommendationLabels[recommendation]}
              </option>
            ))}
          </select>
        </label>
        <label>
          城市
          <select
            value={filters.city}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                city: event.target.value
              })
            }
          >
            <option value="all">全部城市</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <button
          className="panel-action-button"
          disabled={!isFiltered}
          onClick={() => onFiltersChange(defaultApplicationReviewFilters)}
          type="button"
        >
          重置
        </button>
      </div>

      <div className="review-metrics">
        {metrics.map((metric) => (
          <article className="review-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </div>

      {alerts.length > 0 ? (
        <div className="review-alerts">
          {alerts.map((alert) => (
            <span key={alert}>{alert}</span>
          ))}
        </div>
      ) : null}

      <div className="review-strategy" aria-label="策略建议">
        <strong>策略建议</strong>
        <div>
          {summary.strategySuggestions.map((suggestion) => (
            <ReviewStrategySuggestionItem key={suggestion.title} suggestion={suggestion} />
          ))}
        </div>
      </div>

      <ReviewStrategyRecapPanel
        error={strategyRecapError}
        isLoading={isStrategyRecapLoading}
        recap={strategyRecap}
      />

      <div className="review-distributions">
        <ReviewDistribution items={summary.recommendationDistribution} title="投递建议分布" />
        <ReviewDistribution items={summary.cityDistribution} title="城市分布" />
        <ReviewDistribution items={summary.versionDistribution} title="版本迭代" />
      </div>

      <div className="review-attribution" aria-label="效果归因">
        {summary.attributionGroups.map((group) => (
          <ReviewAttributionGroup group={group} key={group.title} />
        ))}
      </div>
    </section>
  );
}

function AiProviderHealthCard({
  error,
  health,
  isLoading,
  onRefresh
}: {
  error: string | null;
  health: AiProviderHealth | null;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const status = error ? "failed" : (health?.status ?? "not_configured");
  const title = getAiProviderHealthTitle(status);
  const meta = health?.providerName
    ? `${health.providerName} · ${formatHealthCheckedAt(health.checkedAt)}`
    : formatHealthCheckedAt(health?.checkedAt);
  const detail = error ?? health?.detail;

  return (
    <div className={`ai-provider-health ai-provider-health--${status}`}>
      <div>
        <div>
          <strong>{title}</strong>
          <span>{meta}</span>
        </div>
        <p>{error ?? health?.message ?? "正在检查 AI Provider 状态"}</p>
        {detail ? <small>{detail}</small> : null}
      </div>
      <button className="panel-action-button" disabled={isLoading} onClick={onRefresh} type="button">
        <RefreshCw size={14} />
        {isLoading ? "检查中" : "刷新"}
      </button>
    </div>
  );
}

function AiGenerationRunList({ runs }: { runs: AiGenerationRun[] }) {
  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="ai-generation-runs" aria-label="最近 AI 生成记录">
      <strong>最近 AI 生成</strong>
      <div>
        {runs.map((run) => (
          <article className={`ai-generation-run ai-generation-run--${run.status}`} key={run.id}>
            <div>
              <span>{formatAiGenerationFeature(run.feature)}</span>
              <small>{formatAiGenerationStatus(run.status)}</small>
            </div>
            <p>
              {run.providerName ?? run.modelName ?? "rule-based"} · {run.durationMs}ms
              {run.promptVersion ? ` · ${run.promptVersion}` : ""}
            </p>
            {run.errorMessage ? <small>{run.errorMessage}</small> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function formatAiGenerationFeature(feature: string) {
  const labels: Record<string, string> = {
    "application-review-strategy": "策略复盘",
    "greeting-generation": "打招呼语",
    "instant-job-analysis": "即时分析",
    "job-analysis": "岗位分析",
    "resume-generation": "定制简历"
  };

  return labels[feature] ?? feature;
}

function formatAiGenerationStatus(status: AiGenerationRun["status"]) {
  if (status === "provider_success") {
    return "模型成功";
  }

  if (status === "provider_fallback") {
    return "已降级";
  }

  return "规则版";
}

function getAiProviderHealthTitle(status: AiProviderHealth["status"]) {
  if (status === "ok") {
    return "AI Provider 可用";
  }

  if (status === "failed") {
    return "AI Provider 验证失败";
  }

  return "AI Provider 未配置";
}

function formatHealthCheckedAt(value?: string) {
  if (!value) {
    return "尚未检查";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function ReviewStrategySuggestionItem({
  suggestion
}: {
  suggestion: ApplicationReviewStrategySuggestion;
}) {
  const priorityLabel = {
    high: "高",
    low: "低",
    medium: "中"
  }[suggestion.priority];

  return (
    <article className={`review-strategy-item review-strategy-item--${suggestion.priority}`}>
      <div>
        <span>{priorityLabel}</span>
        <strong>{suggestion.title}</strong>
      </div>
      <p>{suggestion.detail}</p>
      <small>{suggestion.action}</small>
    </article>
  );
}

function ReviewStrategyRecapPanel({
  error,
  isLoading,
  recap
}: {
  error: string | null;
  isLoading: boolean;
  recap: ApplicationReviewStrategyRecap | null;
}) {
  if (isLoading && !recap) {
    return (
      <div className="review-ai-recap" aria-label="AI 策略复盘">
        <strong>AI 策略复盘</strong>
        <p>正在生成复盘摘要...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-ai-recap" aria-label="AI 策略复盘">
        <strong>AI 策略复盘</strong>
        <p>{error}</p>
      </div>
    );
  }

  if (!recap) {
    return null;
  }

  return (
    <div className="review-ai-recap" aria-label="AI 策略复盘">
      <div className="review-ai-recap__header">
        <strong>AI 策略复盘</strong>
        <span>
          {recap.modelName} · {recap.promptVersion}
        </span>
      </div>
      <p>{recap.summary}</p>
      <div>
        <ReviewStrategyRecapList items={recap.focus} title="下一步重点" />
        <ReviewStrategyRecapList items={recap.experiments} title="建议实验" />
        <ReviewStrategyRecapList items={recap.risks} title="风险提醒" />
      </div>
    </div>
  );
}

function ReviewStrategyRecapList({ items, title }: { items: string[]; title: string }) {
  return (
    <section>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ReviewAttributionGroup({ group }: { group: ApplicationReviewAttributionGroup }) {
  return (
    <div className="review-attribution-group">
      <strong>{group.title}</strong>
      {group.items.length > 0 ? (
        <div>
          <div className="review-attribution-heading">
            <span>分组</span>
            <span>回复</span>
            <span>面试</span>
          </div>
          {group.items.map((item) => (
            <article className="review-attribution-row" key={item.label}>
              <div>
                <span>{item.label}</span>
                <small>
                  {item.appliedOrBeyond}/{item.totalJobs} 已投递
                </small>
              </div>
              <strong>{formatReviewRate(item.replyCount, item.appliedOrBeyond)}</strong>
              <small>{formatReviewRate(item.interviewOrOffer, item.appliedOrBeyond)}</small>
            </article>
          ))}
        </div>
      ) : (
        <p>暂无数据</p>
      )}
    </div>
  );
}

function ReviewDistribution({
  items,
  title
}: {
  items: ApplicationReviewDistributionItem[];
  title: string;
}) {
  if (items.length === 0) {
    return (
      <div className="review-distribution">
        <strong>{title}</strong>
        <p>暂无数据</p>
      </div>
    );
  }

  return (
    <div className="review-distribution">
      <strong>{title}</strong>
      <div>
        {items.map((item) => (
          <div className="review-distribution-row" key={item.label}>
            <span>{item.label}</span>
            <div>
              <i style={{ width: `${Math.max(item.rate * 100, 4)}%` }} />
            </div>
            <small>{item.count}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationPanel({
  application,
  events,
  onCopyText,
  onUpdateFollowUp,
  onUpdateStatus
}: {
  application: Application;
  events: ApplicationEvent[];
  onCopyText: (label: string, value: string) => Promise<void>;
  onUpdateFollowUp: (applicationId: string, nextFollowUpAt: string | null) => Promise<void>;
  onUpdateStatus: (applicationId: string, status: Application["status"]) => Promise<void>;
}) {
  const followUpInputValue = application.nextFollowUpAt
    ? toDateTimeLocalValue(application.nextFollowUpAt)
    : "";
  const followUpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (followUpInputRef.current) {
      followUpInputRef.current.value = followUpInputValue;
    }
  }, [followUpInputValue]);

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

function VersionComparePanel({
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
            body: compactText(latestApplication.greetingMessage),
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
            body: compactText(previousApplication.greetingMessage),
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

function formatApiWarnings(warnings?: ApiWarning[]) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return warnings.map((warning) => warning.message).join(" ");
}

function buildReviewScopeLabel(filters: ApplicationReviewFilters) {
  const parts = [
    filters.status === "all" ? undefined : boardStageLabels[filters.status],
    getRecommendationScopeLabel(filters.recommendation),
    filters.city === "all" ? undefined : filters.city
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" / ") : "全部岗位";
}

function getRecommendationScopeLabel(recommendation: ApplicationReviewRecommendationFilter) {
  if (recommendation === "all") {
    return undefined;
  }

  if (recommendation === "unanalyzed") {
    return "未分析";
  }

  return recommendationLabels[recommendation];
}

function compactText(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
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

function isFollowUpDue(value?: string) {
  const bucket = getFollowUpBucket(value);

  return bucket === "overdue" || bucket === "today";
}

function isFollowUpFilter(value: JobBoardFilter): value is FollowUpFilter {
  return value.startsWith("followUp");
}

function getFollowUpBucket(value?: string): FollowUpBucket {
  if (!value) {
    return "none";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "none";
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfUpcoming = new Date(endOfToday);
  endOfUpcoming.setDate(endOfUpcoming.getDate() + 3);

  if (timestamp < startOfToday.getTime()) {
    return "overdue";
  }

  if (timestamp <= endOfToday.getTime()) {
    return "today";
  }

  if (timestamp <= endOfUpcoming.getTime()) {
    return "upcoming";
  }

  return "none";
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
