import type { Application, JobAnalysis, JobPosting, ResumeVersion } from "@boss-jobpilot/shared";

export type ApplicationReviewDistributionItem = {
  count: number;
  label: string;
  rate: number;
};

export type ApplicationReviewAttributionItem = {
  appliedOrBeyond: number;
  interviewOrOffer: number;
  interviewRate: number;
  label: string;
  replyCount: number;
  replyRate: number;
  totalJobs: number;
};

export type ApplicationReviewAttributionGroup = {
  items: ApplicationReviewAttributionItem[];
  title: string;
};

export type ApplicationReviewStrategySuggestion = {
  action: string;
  detail: string;
  priority: "high" | "medium" | "low";
  title: string;
};

export type ApplicationReviewSummary = {
  activeApplications: number;
  appliedOrBeyond: number;
  averageMatchScore?: number;
  generatedPackages: number;
  interviewOrOffer: number;
  overdueFollowUps: number;
  replyCount: number;
  staleActiveApplications: number;
  statusTotal: number;
  totalJobs: number;
  cityDistribution: ApplicationReviewDistributionItem[];
  recommendationDistribution: ApplicationReviewDistributionItem[];
  versionDistribution: ApplicationReviewDistributionItem[];
  attributionGroups: ApplicationReviewAttributionGroup[];
  strategySuggestions: ApplicationReviewStrategySuggestion[];
};

export type ApplicationReviewStatusFilter = "all" | "unstarted" | Application["status"];

export type ApplicationReviewRecommendationFilter = "all" | "unanalyzed" | JobAnalysis["recommendation"];

export type ApplicationReviewFilters = {
  city: string;
  recommendation: ApplicationReviewRecommendationFilter;
  status: ApplicationReviewStatusFilter;
};

export const defaultApplicationReviewFilters: ApplicationReviewFilters = {
  city: "all",
  recommendation: "all",
  status: "all"
};

export type ApplicationReviewInput = {
  analysisByJobId: Record<string, JobAnalysis>;
  applicationByJobId: Record<string, Application>;
  applicationHistoryByJobId: Record<string, Application[]>;
  jobs: JobPosting[];
  now?: Date;
  recommendationLabels: Record<JobAnalysis["recommendation"], string>;
  resumeHistoryByJobId: Record<string, ResumeVersion[]>;
};

export function buildApplicationReviewSummary({
  analysisByJobId,
  applicationByJobId,
  applicationHistoryByJobId,
  jobs,
  now = new Date(),
  recommendationLabels,
  resumeHistoryByJobId
}: ApplicationReviewInput): ApplicationReviewSummary {
  const applications = jobs
    .map((job) => applicationByJobId[job.id])
    .filter((application): application is Application => Boolean(application));
  const analyses = jobs
    .map((job) => analysisByJobId[job.id])
    .filter((analysis): analysis is JobAnalysis => Boolean(analysis));
  const appliedOrBeyond = applications.filter((application) =>
    isApplicationAppliedOrBeyond(application.status)
  ).length;
  const replyCount = applications.filter((application) =>
    isApplicationRepliedOrBeyond(application.status)
  ).length;
  const interviewOrOffer = applications.filter(
    (application) => application.status === "interview" || application.status === "offer"
  ).length;
  const overdueFollowUps = applications.filter(
    (application) => getFollowUpBucket(application.nextFollowUpAt, now) === "overdue"
  ).length;
  const staleActiveApplications = applications.filter(
    (application) => isApplicationActive(application.status) && !application.nextFollowUpAt
  ).length;
  const averageMatchScore =
    analyses.length > 0
      ? Math.round(
          analyses.reduce((total, analysis) => total + analysis.matchScore, 0) / analyses.length
        )
      : undefined;
  const generatedPackages = jobs.filter((job) => (resumeHistoryByJobId[job.id]?.length ?? 0) > 0)
    .length;
  const attributionGroups = [
    {
      items: buildAttributionItems(jobs, applicationByJobId, (job) => getJobTypeLabel(job.title)),
      title: "岗位类型"
    },
    {
      items: buildAttributionItems(jobs, applicationByJobId, getCompanyTypeLabel),
      title: "公司类型"
    },
    {
      items: buildAttributionItems(jobs, applicationByJobId, getApplicationReviewCityLabel),
      title: "城市"
    },
    {
      items: buildAttributionItems(
        jobs.filter((job) => Boolean(analysisByJobId[job.id])),
        applicationByJobId,
        (job) => recommendationLabels[analysisByJobId[job.id]?.recommendation ?? "apply"]
      ),
      title: "投递建议"
    },
    {
      items: buildAttributionItems(jobs, applicationByJobId, (job) => {
        const application = applicationByJobId[job.id];

        if (!application) {
          return "未生成话术";
        }

        return application.resumeVersionId
          ? `简历 ${shortId(application.resumeVersionId)}`
          : "未关联简历版本";
      }),
      title: "简历版本"
    }
  ];

  return {
    activeApplications: applications.length,
    appliedOrBeyond,
    attributionGroups,
    averageMatchScore,
    cityDistribution: buildDistribution(jobs.map(getApplicationReviewCityLabel), jobs.length),
    generatedPackages,
    interviewOrOffer,
    overdueFollowUps,
    recommendationDistribution: buildDistribution(
      analyses.map((analysis) => recommendationLabels[analysis.recommendation]),
      analyses.length
    ),
    replyCount,
    staleActiveApplications,
    strategySuggestions: buildStrategySuggestions({
      activeApplications: applications.length,
      appliedOrBeyond,
      attributionGroups,
      averageMatchScore,
      generatedPackages,
      overdueFollowUps,
      replyCount,
      staleActiveApplications,
      totalJobs: jobs.length
    }),
    statusTotal: applications.length,
    totalJobs: jobs.length,
    versionDistribution: buildDistribution(
      jobs.map((job) => {
        const resumeCount = resumeHistoryByJobId[job.id]?.length ?? 0;
        const greetingCount = applicationHistoryByJobId[job.id]?.length ?? 0;
        const versionCount = Math.max(resumeCount, greetingCount);

        if (versionCount === 0) {
          return "未生成";
        }

        if (versionCount === 1) {
          return "1 版";
        }

        return "2 版以上";
      }),
      jobs.length
    )
  };
}

export function filterApplicationReviewJobs({
  analysisByJobId,
  applicationByJobId,
  filters,
  jobs
}: {
  analysisByJobId: Record<string, JobAnalysis>;
  applicationByJobId: Record<string, Application>;
  filters: ApplicationReviewFilters;
  jobs: JobPosting[];
}) {
  return jobs.filter((job) => {
    if (filters.city !== "all" && getApplicationReviewCityLabel(job) !== filters.city) {
      return false;
    }

    const analysis = analysisByJobId[job.id];

    if (filters.recommendation === "unanalyzed") {
      if (analysis) {
        return false;
      }
    } else if (
      filters.recommendation !== "all" &&
      analysis?.recommendation !== filters.recommendation
    ) {
      return false;
    }

    const application = applicationByJobId[job.id];

    if (filters.status === "unstarted") {
      return !application;
    }

    if (filters.status !== "all" && application?.status !== filters.status) {
      return false;
    }

    return true;
  });
}

export function getApplicationReviewCityLabel(job: JobPosting) {
  return job.city?.trim() || "未填写城市";
}

export function formatReviewRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "-";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function buildStrategySuggestions({
  activeApplications,
  appliedOrBeyond,
  attributionGroups,
  averageMatchScore,
  generatedPackages,
  overdueFollowUps,
  replyCount,
  staleActiveApplications,
  totalJobs
}: {
  activeApplications: number;
  appliedOrBeyond: number;
  attributionGroups: ApplicationReviewAttributionGroup[];
  averageMatchScore?: number;
  generatedPackages: number;
  overdueFollowUps: number;
  replyCount: number;
  staleActiveApplications: number;
  totalJobs: number;
}): ApplicationReviewStrategySuggestion[] {
  const suggestions: ApplicationReviewStrategySuggestion[] = [];
  const replyRate = appliedOrBeyond > 0 ? replyCount / appliedOrBeyond : undefined;

  if (overdueFollowUps > 0) {
    suggestions.push({
      action: "打开跟进队列，优先更新这些岗位状态或重新触达。",
      detail: `${overdueFollowUps} 个岗位已经超过下次跟进时间，先处理它们能减少机会沉没。`,
      priority: "high",
      title: "先处理逾期跟进"
    });
  }

  if (staleActiveApplications > 0) {
    suggestions.push({
      action: "为推进中的岗位补上明确的下次跟进时间。",
      detail: `${staleActiveApplications} 个仍在推进的岗位没有跟进提醒，容易丢失节奏。`,
      priority: overdueFollowUps > 0 ? "medium" : "high",
      title: "补齐下次跟进"
    });
  }

  if (appliedOrBeyond === 0 && activeApplications > 0) {
    suggestions.push({
      action: "筛出最匹配的岗位，今天至少推进 3 个到已投递。",
      detail: `${activeApplications} 个岗位已经生成话术，但还没有真实投递记录。`,
      priority: "medium",
      title: "推进草稿到投递"
    });
  }

  if (replyRate !== undefined && appliedOrBeyond >= 3 && replyRate < 0.2) {
    suggestions.push({
      action: "复查岗位方向、开场话术和简历首屏，把低匹配岗位降级。",
      detail: `当前 ${appliedOrBeyond} 个已投递岗位中只有 ${replyCount} 个有回复，回复率偏低。`,
      priority: "medium",
      title: "调整投递方向或话术"
    });
  }

  if (averageMatchScore !== undefined && averageMatchScore < 60) {
    suggestions.push({
      action: "优先投递匹配分更高的岗位，并把低分岗位放入观察。",
      detail: `当前平均匹配分为 ${averageMatchScore}/100，说明岗位要求和经历匹配度不足。`,
      priority: "medium",
      title: "收窄到更匹配岗位"
    });
  }

  if (totalJobs > 0 && generatedPackages < activeApplications) {
    suggestions.push({
      action: "给已有话术但缺少简历版本的岗位补生成定制简历。",
      detail: `${activeApplications} 个已生成话术岗位中，只有 ${generatedPackages} 个有简历草稿。`,
      priority: appliedOrBeyond > 0 ? "low" : "medium",
      title: "补齐定制简历"
    });
  }

  const strongestSignal = findStrongestAttributionSignal(attributionGroups);

  if (strongestSignal) {
    suggestions.push({
      action: `下一轮优先寻找更多“${strongestSignal.label}”相关岗位，并复用当前有效版本。`,
      detail: `${strongestSignal.groupTitle}中“${strongestSignal.label}”已有 ${formatReviewRate(
        strongestSignal.replyCount,
        strongestSignal.appliedOrBeyond
      )} 回复率、${formatReviewRate(
        strongestSignal.interviewOrOffer,
        strongestSignal.appliedOrBeyond
      )} 面试率。`,
      priority: "low",
      title: "放大有效信号"
    });
  }

  if (suggestions.length === 0) {
    return [
      {
        action: "先采集岗位、生成分析、定制简历和打招呼语，再开始复盘。",
        detail: "目前还没有足够的投递和反馈数据，策略建议会随岗位状态自动更新。",
        priority: "low",
        title: "积累复盘样本"
      }
    ];
  }

  return suggestions.slice(0, 4);
}

function findStrongestAttributionSignal(attributionGroups: ApplicationReviewAttributionGroup[]) {
  const candidates = attributionGroups.flatMap((group) =>
    group.items
      .filter((item) => item.appliedOrBeyond > 0 && (item.replyCount > 0 || item.interviewOrOffer > 0))
      .map((item) => ({
        ...item,
        groupTitle: group.title
      }))
  );

  return candidates.sort(
    (left, right) =>
      right.interviewRate - left.interviewRate ||
      right.replyRate - left.replyRate ||
      right.appliedOrBeyond - left.appliedOrBeyond ||
      left.label.localeCompare(right.label)
  )[0];
}

function buildDistribution(values: string[], total: number): ApplicationReviewDistributionItem[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts, ([label, count]) => ({
    count,
    label,
    rate: total > 0 ? count / total : 0
  }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 5);
}

function buildAttributionItems(
  jobs: JobPosting[],
  applicationByJobId: Record<string, Application>,
  getLabel: (job: JobPosting) => string
): ApplicationReviewAttributionItem[] {
  const groups = new Map<
    string,
    {
      appliedOrBeyond: number;
      interviewOrOffer: number;
      replyCount: number;
      totalJobs: number;
    }
  >();

  for (const job of jobs) {
    const label = getLabel(job);
    const group = groups.get(label) ?? {
      appliedOrBeyond: 0,
      interviewOrOffer: 0,
      replyCount: 0,
      totalJobs: 0
    };
    const application = applicationByJobId[job.id];

    group.totalJobs += 1;

    if (application && isApplicationAppliedOrBeyond(application.status)) {
      group.appliedOrBeyond += 1;
    }

    if (application && isApplicationRepliedOrBeyond(application.status)) {
      group.replyCount += 1;
    }

    if (application && (application.status === "interview" || application.status === "offer")) {
      group.interviewOrOffer += 1;
    }

    groups.set(label, group);
  }

  return Array.from(groups, ([label, group]) => ({
    ...group,
    interviewRate: group.appliedOrBeyond > 0 ? group.interviewOrOffer / group.appliedOrBeyond : 0,
    label,
    replyRate: group.appliedOrBeyond > 0 ? group.replyCount / group.appliedOrBeyond : 0
  }))
    .sort(
      (left, right) =>
        right.replyRate - left.replyRate ||
        right.interviewRate - left.interviewRate ||
        right.appliedOrBeyond - left.appliedOrBeyond ||
        right.totalJobs - left.totalJobs ||
        left.label.localeCompare(right.label)
    )
    .slice(0, 4);
}

function getJobTypeLabel(title: string) {
  const normalized = title.toLowerCase();

  if (
    normalized.includes("ai") ||
    normalized.includes("llm") ||
    /算法|机器学习|大模型|智能/.test(title)
  ) {
    return "AI / 算法";
  }

  if (
    normalized.includes("full stack") ||
    normalized.includes("backend") ||
    normalized.includes("node") ||
    /全栈|后端/.test(title)
  ) {
    return "全栈 / 后端";
  }

  if (normalized.includes("frontend") || /前端|react|vue|web/.test(title)) {
    return "前端";
  }

  if (normalized.includes("data") || /数据|分析|bi/.test(title)) {
    return "数据";
  }

  if (normalized.includes("intern") || /实习|校招/.test(title)) {
    return "实习 / 校招";
  }

  return "其他";
}

function getCompanyTypeLabel(job: JobPosting) {
  const source = job.companyName?.trim() || [job.title, job.jdRaw].filter(Boolean).join(" ");
  const normalized = source.toLowerCase();

  if (!source.trim()) {
    return "未填写公司";
  }

  if (/外包|驻场|人力|咨询|outsourcing|consulting|agency/.test(normalized)) {
    return "外包 / 服务商";
  }

  if (/银行|保险|证券|基金|支付|金融|fintech|bank|finance|payment/.test(normalized)) {
    return "金融";
  }

  if (/教育|培训|学校|课程|edu|education|training/.test(normalized)) {
    return "教育";
  }

  if (/电商|零售|商城|本地生活|commerce|retail|mall/.test(normalized)) {
    return "电商 / 零售";
  }

  if (/游戏|game|gaming/.test(normalized)) {
    return "游戏";
  }

  if (
    /科技|技术|智能|数据|云|软件|信息|网络|ai|llm|saas|cloud|software|tech|data/.test(normalized)
  ) {
    return "科技产品";
  }

  return "其他公司";
}

function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function getFollowUpBucket(value: string | undefined, now: Date) {
  if (!value) {
    return "none";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "none";
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (timestamp < startOfToday.getTime()) {
    return "overdue";
  }

  if (timestamp <= endOfToday.getTime()) {
    return "today";
  }

  return "none";
}

function isApplicationAppliedOrBeyond(status: Application["status"]) {
  return ["applied", "replied", "interview", "offer", "rejected", "closed"].includes(status);
}

function isApplicationRepliedOrBeyond(status: Application["status"]) {
  return ["replied", "interview", "offer"].includes(status);
}

function isApplicationActive(status: Application["status"]) {
  return ["greeted", "applied", "replied", "interview"].includes(status);
}
