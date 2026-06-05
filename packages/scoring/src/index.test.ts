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
      }
    );

    expect(analysis.matchScore).toBeGreaterThanOrEqual(80);
    expect(analysis.requiredSkills).toContain("React");
    expect(analysis.bonusSkills).toContain("RAG");
    expect(analysis.resumeStrategy).toContain("AI Frontend Engineer");
  });
});
