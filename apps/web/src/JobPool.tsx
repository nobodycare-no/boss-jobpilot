import { type FormEvent, useEffect, useMemo, useState } from "react";

import { BriefcaseBusiness, Plus, RefreshCw, Timer } from "lucide-react";

import type {
  Application,
  ApplicationEvent,
  ApplicationReviewStrategyRecap,
  AiGenerationRun,
  ExperienceItem,
  GreetingVariant,
  JobAnalysis,
  JobPosting,
  JobPostingCreateInput,
  ResumeVariant,
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
  saveEditedResume,
  type AiProviderHealth,
  type ApiWarning,
  updateApplication
} from "./api";
import {
  buildApplicationReviewStrategyRequest,
  buildApplicationReviewSummary,
  defaultApplicationReviewFilters,
  filterApplicationReviewJobs,
  getApplicationReviewCityLabel,
  type ApplicationReviewFilters,
  type ApplicationReviewRecommendationFilter
} from "./application-review";
import { ApplicationReviewPanel } from "./application-review-panel";
import {
  boardStageLabels,
  boardStageOrder,
  recommendationLabels,
  type JobBoardStage
} from "./job-labels";
import { JobCard } from "./job-card";

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

type FollowUpFilter = "followUpDue" | "followUpOverdue" | "followUpToday" | "followUpUpcoming";
type JobBoardFilter = "all" | FollowUpFilter | JobBoardStage;
type FollowUpBucket = "overdue" | "today" | "upcoming" | "none";

const followUpFilterItems = [
  { filter: "followUpDue", label: "今日待跟进" },
  { filter: "followUpOverdue", label: "逾期" },
  { filter: "followUpToday", label: "今天" },
  { filter: "followUpUpcoming", label: "未来 3 天" }
] satisfies Array<{
  filter: FollowUpFilter;
  label: string;
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

  async function handleGenerateResume(id: string, variant: ResumeVariant) {
    setError(null);
    setFeedback(null);

    try {
      const response = await generateResume(id, variant);
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

  async function handleGenerateGreeting(id: string, variant: GreetingVariant) {
    setError(null);
    setFeedback(null);

    try {
      const response = await generateGreeting(id, variant);
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

  async function handleSaveResumeEdit(resume: ResumeVersion, markdownContent: string) {
    setError(null);
    setFeedback(null);

    if (!markdownContent.trim()) {
      setError("编辑后的简历不能为空");
      return;
    }

    try {
      const response = await saveEditedResume(resume.jobId, {
        changeSummary: "基于当前版本手动编辑保存。",
        markdownContent,
        selectedExperienceIds: resume.selectedExperienceIds,
        variant: toEditedResumeVariant(resume.variant)
      });
      setResumeByJobId((current) => ({
        ...current,
        [response.item.jobId]: response.item
      }));
      const history = await listResumes(response.item.jobId);
      setResumeHistoryByJobId((current) => ({
        ...current,
        [response.item.jobId]: history.items
      }));
      const currentApplication = applicationByJobId[response.item.jobId];

      if (currentApplication) {
        const applicationResponse = await updateApplication(currentApplication.id, {
          resumeVersionId: response.item.id
        });
        setApplicationByJobId((current) => ({
          ...current,
          [applicationResponse.item.jobId]: applicationResponse.item
        }));
        const applicationHistory = await listApplications(applicationResponse.item.jobId);
        setApplicationHistoryByJobId((current) => ({
          ...current,
          [applicationResponse.item.jobId]: applicationHistory.items
        }));
      }
      setFeedback("编辑后的简历已保存为新版本");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "编辑后的简历保存失败");
    }
  }

  async function handleSaveGreetingEdit(applicationId: string, greetingMessage: string) {
    setError(null);
    setFeedback(null);

    if (!greetingMessage.trim()) {
      setError("打招呼语不能为空");
      return;
    }

    try {
      const response = await updateApplication(applicationId, {
        greetingMessage
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
      setFeedback("打招呼语已保存");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "打招呼语保存失败");
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
              aiGenerationRuns={aiGenerationRuns}
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
              jobs={jobs}
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
                  onSaveGreetingEdit={handleSaveGreetingEdit}
                  onSaveResumeEdit={handleSaveResumeEdit}
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

function formatApiWarnings(warnings?: ApiWarning[]) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return warnings.map((warning) => warning.message).join(" ");
}

function toEditedResumeVariant(variant: string) {
  return `edited-${variant.replace(/^(edited-)+/, "")}`;
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
