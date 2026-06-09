import type { Application, JobAnalysis, JobPosting, ResumeVersion } from "@boss-jobpilot/shared";

export type ApplicationReviewDistributionItem = {
  count: number;
  label: string;
  rate: number;
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

  return {
    activeApplications: applications.length,
    appliedOrBeyond,
    averageMatchScore,
    cityDistribution: buildDistribution(
      jobs.map((job) => job.city?.trim() || "未填写城市"),
      jobs.length
    ),
    generatedPackages: jobs.filter((job) => (resumeHistoryByJobId[job.id]?.length ?? 0) > 0).length,
    interviewOrOffer,
    overdueFollowUps,
    recommendationDistribution: buildDistribution(
      analyses.map((analysis) => recommendationLabels[analysis.recommendation]),
      analyses.length
    ),
    replyCount,
    staleActiveApplications,
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

export function formatReviewRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "-";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
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
