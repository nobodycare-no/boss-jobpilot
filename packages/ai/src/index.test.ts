import { describe, expect, it } from "vitest";

import {
  generateApplicationReviewStrategyRecap,
  generateGreetingDraft,
  promptVersions
} from "./index";

describe("greeting draft generation", () => {
  it("generates a personalized greeting from job analysis and matched experience", () => {
    const draft = generateGreetingDraft({
      job: {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: "React TypeScript AI",
        companyName: "Example Tech",
        capturedAt: "2026-01-01T00:00:00.000Z"
      },
      analysis: {
        id: "analysis-1",
        jobId: "job-1",
        matchScore: 88,
        recommendation: "prioritize",
        matchedKeywords: ["React", "TypeScript"],
        requiredSkills: ["React", "TypeScript", "AI"],
        bonusSkills: [],
        matchedExperienceIds: ["exp-1"],
        riskFlags: [],
        resumeStrategy: "Lead with AI frontend work.",
        modelName: "rule-based",
        promptVersion: "rule-based-job-analysis@0.1.0",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      experiences: [
        {
          id: "exp-1",
          type: "project",
          title: "AI resume tailoring workspace",
          summary: "Built React and TypeScript workflow for AI job applications.",
          techStack: ["React", "TypeScript", "Node.js"],
          responsibilities: [],
          achievements: [],
          metrics: [],
          evidenceLevel: "deep_interview_ready",
          ownershipLevel: "owned",
          tags: []
        }
      ]
    });

    expect(draft.message).toContain("Example Tech");
    expect(draft.message).toContain("AI resume tailoring workspace");
    expect(draft.selectedExperienceIds).toEqual(["exp-1"]);
    expect(draft.promptVersion).toBe(promptVersions.greetingWriter);
  });
});

describe("application review strategy recap", () => {
  it("generates a structured recap from review metrics and signals", () => {
    const recap = generateApplicationReviewStrategyRecap({
      activeApplications: 4,
      appliedOrBeyond: 3,
      averageMatchScore: 72,
      generatedPackages: 2,
      interviewOrOffer: 1,
      overdueFollowUps: 1,
      replyCount: 2,
      staleActiveApplications: 1,
      totalJobs: 5,
      scopeLabel: "上海 / 优先投递",
      strategySuggestions: [
        {
          action: "先处理逾期跟进。",
          detail: "1 个岗位已经逾期。",
          priority: "high",
          title: "先处理逾期跟进"
        }
      ],
      attributionSignals: [
        {
          appliedOrBeyond: 2,
          groupTitle: "公司类型",
          interviewOrOffer: 1,
          label: "科技产品",
          replyCount: 2
        }
      ]
    });

    expect(recap.summary).toContain("上海 / 优先投递");
    expect(recap.summary).toContain("回复率 67%");
    expect(recap.focus).toContain("先处理逾期跟进。");
    expect(recap.experiments.join(" ")).toContain("补生成简历");
    expect(recap.modelName).toBe("rule-based");
    expect(recap.promptVersion).toBe(promptVersions.applicationReviewStrategist);
  });
});
