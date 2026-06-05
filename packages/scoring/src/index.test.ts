import { describe, expect, it } from "vitest";

import { analyzeJobPosting, computeJobMatchScore } from "./index";

describe("computeJobMatchScore", () => {
  it("prioritizes jobs with preferred keywords and no blocked signals", () => {
    const score = computeJobMatchScore(
      {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: "Build React, TypeScript, Node.js and AI API integrations.",
        city: "Shanghai",
        capturedAt: new Date().toISOString()
      },
      {
        targetRoles: ["Frontend Engineer"],
        targetCities: ["Shanghai"],
        preferredKeywords: ["React", "TypeScript", "AI", "Node.js"],
        blockedKeywords: ["outsourcing", "onsite vendor"]
      }
    );

    expect(score.recommendation).toBe("prioritize");
    expect(score.riskFlags).toHaveLength(0);
  });
});

describe("analyzeJobPosting", () => {
  it("returns structured analysis for resume tailoring", () => {
    const analysis = analyzeJobPosting(
      {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: [
          "Build React and TypeScript applications with Node.js APIs.",
          "OpenAI or RAG experience is a plus."
        ].join("\n"),
        city: "Shanghai",
        capturedAt: new Date().toISOString()
      },
      {
        targetRoles: ["Frontend Engineer"],
        targetCities: ["Shanghai"],
        preferredKeywords: ["React", "TypeScript", "AI", "Node.js"],
        blockedKeywords: ["outsourcing"]
      },
      [
        {
          id: "exp-ai-frontend",
          type: "project",
          title: "AI resume tailoring workspace",
          role: "Frontend Engineer",
          summary: "Built React and TypeScript UI with Node.js APIs and OpenAI integration.",
          techStack: ["React", "TypeScript", "Node.js", "OpenAI"],
          responsibilities: ["Implemented job analysis workflow"],
          achievements: ["Reduced manual resume tailoring time"],
          metrics: [],
          evidenceLevel: "deep_interview_ready",
          ownershipLevel: "owned",
          tags: ["AI"]
        },
        {
          id: "exp-hidden",
          type: "project",
          title: "Old admin page",
          techStack: ["React"],
          responsibilities: [],
          achievements: [],
          metrics: [],
          evidenceLevel: "do_not_use",
          ownershipLevel: "owned",
          tags: []
        }
      ]
    );

    expect(analysis.matchScore).toBeGreaterThanOrEqual(80);
    expect(analysis.requiredSkills).toContain("React");
    expect(analysis.bonusSkills).toContain("RAG");
    expect(analysis.matchedExperienceIds).toEqual(["exp-ai-frontend"]);
    expect(analysis.resumeStrategy).toContain("AI Frontend Engineer");
    expect(analysis.resumeStrategy).toContain("1");
  });
});
