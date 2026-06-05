import { describe, expect, it } from "vitest";

import { generateTailoredResumeDraft, renderResumeMarkdown } from "./index";

describe("tailored resume generation", () => {
  it("generates a resume draft from a job analysis and matched experiences", () => {
    const draft = generateTailoredResumeDraft({
      job: {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: "Build React and TypeScript AI tools.",
        companyName: "Example Tech",
        capturedAt: "2026-01-01T00:00:00.000Z"
      },
      analysis: {
        id: "analysis-1",
        jobId: "job-1",
        matchScore: 90,
        recommendation: "prioritize",
        matchedKeywords: ["React", "TypeScript"],
        requiredSkills: ["React", "TypeScript"],
        bonusSkills: ["AI"],
        matchedExperienceIds: ["exp-1"],
        riskFlags: [],
        resumeStrategy: "Lead with AI frontend delivery.",
        modelName: "rule-based",
        promptVersion: "rule-based-job-analysis@0.1.0",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      experiences: [
        {
          id: "exp-1",
          type: "project",
          title: "AI resume tailoring workspace",
          summary: "Built a React and TypeScript workflow.",
          techStack: ["React", "TypeScript", "Node.js"],
          responsibilities: ["Implemented job analysis workflow"],
          achievements: ["Reduced manual resume tailoring time"],
          metrics: ["Saved 70% drafting time"],
          evidenceLevel: "deep_interview_ready",
          ownershipLevel: "owned",
          tags: ["AI"]
        }
      ]
    });

    expect(draft.headline).toContain("AI Frontend Engineer");
    expect(draft.skills).toEqual(["React", "TypeScript", "AI", "Node.js"]);
    expect(draft.experiences).toHaveLength(1);
    expect(renderResumeMarkdown(draft)).toContain("AI resume tailoring workspace");
  });
});
