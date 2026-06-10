import { describe, expect, it } from "vitest";

import type { Application, JobAnalysis, JobPosting, ResumeVersion } from "@boss-jobpilot/shared";

import {
  buildApplicationReviewStrategyRequest,
  buildApplicationReviewSummary,
  filterApplicationReviewJobs,
  formatReviewRate
} from "./application-review";

const recommendationLabels: Record<JobAnalysis["recommendation"], string> = {
  apply: "可以投递",
  cautious: "谨慎投递",
  prioritize: "优先投递",
  skip: "建议跳过"
};

describe("application review summary", () => {
  it("calculates conversion, follow-up risk and lightweight distributions", () => {
    const jobs = [
      createJob("job-1", "AI Frontend Engineer", "上海", "Alpha 科技"),
      createJob("job-2", "Full Stack Engineer", "北京", "Beta 金融"),
      createJob("job-3", "Frontend Intern", "上海", "Gamma 外包咨询"),
      createJob("job-4", "Data Analyst", undefined, "Example")
    ];
    const summary = buildApplicationReviewSummary({
      analysisByJobId: {
        "job-1": createAnalysis("job-1", 90, "prioritize"),
        "job-2": createAnalysis("job-2", 70, "apply"),
        "job-3": createAnalysis("job-3", 50, "cautious")
      },
      applicationByJobId: {
        "job-1": createApplication("app-1", "job-1", "replied", undefined, "resume-2"),
        "job-2": createApplication("app-2", "job-2", "interview", undefined, "resume-3"),
        "job-3": createApplication("app-3", "job-3", "applied", "2026-06-08T01:00:00.000Z")
      },
      applicationHistoryByJobId: {
        "job-1": [
          createApplication("app-1-latest", "job-1", "replied"),
          createApplication("app-1-previous", "job-1", "draft")
        ],
        "job-2": [createApplication("app-2", "job-2", "interview")],
        "job-3": [createApplication("app-3", "job-3", "applied")]
      },
      jobs,
      now: new Date("2026-06-09T12:00:00.000Z"),
      recommendationLabels,
      resumeHistoryByJobId: {
        "job-1": [createResume("resume-1", "job-1"), createResume("resume-2", "job-1")],
        "job-2": [createResume("resume-3", "job-2")]
      }
    });

    expect(summary.totalJobs).toBe(4);
    expect(summary.activeApplications).toBe(3);
    expect(summary.appliedOrBeyond).toBe(3);
    expect(summary.replyCount).toBe(2);
    expect(summary.interviewOrOffer).toBe(1);
    expect(summary.averageMatchScore).toBe(70);
    expect(summary.generatedPackages).toBe(2);
    expect(summary.overdueFollowUps).toBe(1);
    expect(summary.staleActiveApplications).toBe(2);
    expect(summary.strategySuggestions).toHaveLength(4);
    expect(summary.strategySuggestions.slice(0, 3)).toEqual([
      {
        action: "打开跟进队列，优先更新这些岗位状态或重新触达。",
        detail: "1 个岗位已经超过下次跟进时间，先处理它们能减少机会沉没。",
        priority: "high",
        title: "先处理逾期跟进"
      },
      {
        action: "为推进中的岗位补上明确的下次跟进时间。",
        detail: "2 个仍在推进的岗位没有跟进提醒，容易丢失节奏。",
        priority: "medium",
        title: "补齐下次跟进"
      },
      {
        action: "给已有话术但缺少简历版本的岗位补生成定制简历。",
        detail: "3 个已生成话术岗位中，只有 2 个有简历草稿。",
        priority: "low",
        title: "补齐定制简历"
      }
    ]);
    expect(summary.strategySuggestions[3]).toMatchObject({
      priority: "low",
      title: "放大有效信号"
    });
    expect(buildApplicationReviewStrategyRequest(summary, "全部岗位")).toMatchObject({
      activeApplications: 3,
      appliedOrBeyond: 3,
      scopeLabel: "全部岗位",
      strategySuggestions: summary.strategySuggestions,
      attributionSignals: expect.arrayContaining([
        {
          appliedOrBeyond: 1,
          groupTitle: "公司类型",
          interviewOrOffer: 1,
          label: "金融",
          replyCount: 1
        }
      ])
    });
    expect(summary.cityDistribution).toEqual([
      { count: 2, label: "上海", rate: 0.5 },
      { count: 1, label: "北京", rate: 0.25 },
      { count: 1, label: "未填写城市", rate: 0.25 }
    ]);
    expect(summary.recommendationDistribution).toEqual([
      { count: 1, label: "谨慎投递", rate: 1 / 3 },
      { count: 1, label: "可以投递", rate: 1 / 3 },
      { count: 1, label: "优先投递", rate: 1 / 3 }
    ]);
    expect(summary.versionDistribution).toEqual([
      { count: 2, label: "1 版", rate: 0.5 },
      { count: 1, label: "2 版以上", rate: 0.25 },
      { count: 1, label: "未生成", rate: 0.25 }
    ]);
    expect(summary.attributionGroups).toEqual([
      {
        title: "岗位类型",
        items: [
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 1,
            interviewRate: 1,
            label: "全栈 / 后端",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "AI / 算法",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "前端",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 0,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "数据",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          }
        ]
      },
      {
        title: "公司类型",
        items: [
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 1,
            interviewRate: 1,
            label: "金融",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "科技产品",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "外包 / 服务商",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 0,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "其他公司",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          }
        ]
      },
      {
        title: "城市",
        items: [
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 1,
            interviewRate: 1,
            label: "北京",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 2,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "上海",
            replyCount: 1,
            replyRate: 0.5,
            totalJobs: 2
          },
          {
            appliedOrBeyond: 0,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "未填写城市",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          }
        ]
      },
      {
        title: "投递建议",
        items: [
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 1,
            interviewRate: 1,
            label: "可以投递",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "优先投递",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "谨慎投递",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          }
        ]
      },
      {
        title: "简历版本",
        items: [
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 1,
            interviewRate: 1,
            label: "简历 resume-3",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "简历 resume-2",
            replyCount: 1,
            replyRate: 1,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 1,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "未关联简历版本",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          },
          {
            appliedOrBeyond: 0,
            interviewOrOffer: 0,
            interviewRate: 0,
            label: "未生成话术",
            replyCount: 0,
            replyRate: 0,
            totalJobs: 1
          }
        ]
      }
    ]);
  });

  it("formats unavailable rates without dividing by zero", () => {
    expect(formatReviewRate(0, 0)).toBe("-");
    expect(formatReviewRate(2, 3)).toBe("67%");
  });

  it("returns a starter strategy suggestion when there is no review sample", () => {
    const summary = buildApplicationReviewSummary({
      analysisByJobId: {},
      applicationByJobId: {},
      applicationHistoryByJobId: {},
      jobs: [],
      recommendationLabels,
      resumeHistoryByJobId: {}
    });

    expect(summary.strategySuggestions).toEqual([
      {
        action: "先采集岗位、生成分析、定制简历和打招呼语，再开始复盘。",
        detail: "目前还没有足够的投递和反馈数据，策略建议会随岗位状态自动更新。",
        priority: "low",
        title: "积累复盘样本"
      }
    ]);
  });

  it("filters review jobs by status, recommendation and city", () => {
    const jobs = [
      createJob("job-1", "AI Frontend Engineer", "上海", "Alpha 科技"),
      createJob("job-2", "Full Stack Engineer", "北京", "Beta 金融"),
      createJob("job-3", "Frontend Intern", "上海", "Gamma 外包咨询"),
      createJob("job-4", "Data Analyst", undefined, "Example")
    ];
    const analysisByJobId = {
      "job-1": createAnalysis("job-1", 90, "prioritize"),
      "job-2": createAnalysis("job-2", 70, "apply"),
      "job-3": createAnalysis("job-3", 50, "cautious")
    };
    const applicationByJobId = {
      "job-1": createApplication("app-1", "job-1", "replied"),
      "job-2": createApplication("app-2", "job-2", "interview"),
      "job-3": createApplication("app-3", "job-3", "applied")
    };

    expect(
      filterApplicationReviewJobs({
        analysisByJobId,
        applicationByJobId,
        filters: {
          city: "上海",
          recommendation: "cautious",
          status: "applied"
        },
        jobs
      }).map((job) => job.id)
    ).toEqual(["job-3"]);
    expect(
      filterApplicationReviewJobs({
        analysisByJobId,
        applicationByJobId,
        filters: {
          city: "all",
          recommendation: "unanalyzed",
          status: "unstarted"
        },
        jobs
      }).map((job) => job.id)
    ).toEqual(["job-4"]);
  });
});

function createJob(
  id: string,
  title: string,
  city: string | undefined,
  companyName: string
): JobPosting {
  return {
    capturedAt: "2026-06-09T00:00:00.000Z",
    city,
    companyName,
    id,
    jdRaw: "React TypeScript Node.js",
    platform: "boss",
    title
  };
}

function createAnalysis(
  jobId: string,
  matchScore: number,
  recommendation: JobAnalysis["recommendation"]
): JobAnalysis {
  return {
    bonusSkills: [],
    createdAt: "2026-06-09T00:00:00.000Z",
    id: `analysis-${jobId}`,
    jobId,
    matchScore,
    matchedExperienceIds: [],
    matchedKeywords: [],
    modelName: "rule-based",
    promptVersion: "test",
    recommendation,
    requiredSkills: [],
    resumeStrategy: "",
    riskFlags: []
  };
}

function createApplication(
  id: string,
  jobId: string,
  status: Application["status"],
  nextFollowUpAt?: string,
  resumeVersionId?: string
): Application {
  return {
    createdAt: "2026-06-09T00:00:00.000Z",
    greetingVariant: "evidence",
    greetingMessage: "你好，我对这个岗位很感兴趣。",
    id,
    jobId,
    nextFollowUpAt,
    resumeVersionId,
    status,
    updatedAt: "2026-06-09T00:00:00.000Z"
  };
}

function createResume(id: string, jobId: string): ResumeVersion {
  return {
    changeSummary: "",
    createdAt: "2026-06-09T00:00:00.000Z",
    id,
    jobId,
    markdownContent: "# Resume",
    selectedExperienceIds: [],
    variant: "正式版"
  };
}
