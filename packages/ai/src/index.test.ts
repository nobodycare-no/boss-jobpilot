import { describe, expect, it } from "vitest";

import { generateGreetingDraft, promptVersions } from "./index";

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
