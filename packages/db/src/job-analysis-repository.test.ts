import { describe, expect, it } from "vitest";

import { openJobpilotDatabase } from "./experience-repository";
import { createJobAnalysisRepository } from "./job-analysis-repository";
import { createJobRepository } from "./job-repository";

describe("job analysis repository", () => {
  it("creates, lists and returns the latest analysis for a job", () => {
    const db = openJobpilotDatabase(":memory:");
    const jobs = createJobRepository(db);
    const analyses = createJobAnalysisRepository(db);

    const job = jobs.create({
      platform: "boss",
      title: "AI Frontend Engineer",
      jdRaw: "React, TypeScript and Node.js"
    });

    const first = analyses.create({
      jobId: job.id,
      matchScore: 72,
      recommendation: "apply",
      matchedKeywords: ["React"],
      requiredSkills: ["React", "TypeScript"],
      bonusSkills: [],
      matchedExperienceIds: [],
      riskFlags: [],
      resumeStrategy: "Lead with frontend project evidence.",
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    const second = analyses.create({
      jobId: job.id,
      matchScore: 86,
      recommendation: "prioritize",
      matchedKeywords: ["React", "TypeScript", "Node.js"],
      requiredSkills: ["React", "TypeScript", "Node.js"],
      bonusSkills: [],
      matchedExperienceIds: [],
      riskFlags: [],
      resumeStrategy: "Lead with AI frontend work.",
      createdAt: "2026-01-02T00:00:00.000Z"
    });

    expect(first.id).toBeTruthy();
    expect(analyses.listByJobId(job.id)).toHaveLength(2);
    expect(analyses.getLatestByJobId(job.id)?.id).toBe(second.id);

    db.close();
  });
});
