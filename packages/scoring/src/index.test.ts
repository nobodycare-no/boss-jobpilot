import { describe, expect, it } from "vitest";

import { computeJobMatchScore } from "./index";

describe("computeJobMatchScore", () => {
  it("prioritizes jobs with preferred keywords and no blocked signals", () => {
    const score = computeJobMatchScore(
      {
        id: "job-1",
        platform: "boss",
        title: "AI 应用开发工程师",
        jdRaw: "负责 React、TypeScript、Node.js 和 AI API 接入。",
        city: "上海",
        capturedAt: new Date().toISOString()
      },
      {
        targetRoles: ["AI 应用开发"],
        targetCities: ["上海"],
        preferredKeywords: ["React", "TypeScript", "AI", "Node.js"],
        blockedKeywords: ["外包", "驻场"]
      }
    );

    expect(score.recommendation).toBe("prioritize");
    expect(score.riskFlags).toHaveLength(0);
  });
});
