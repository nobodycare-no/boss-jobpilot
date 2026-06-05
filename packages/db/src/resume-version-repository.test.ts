import { describe, expect, it } from "vitest";

import { openJobpilotDatabase } from "./experience-repository";
import { createJobRepository } from "./job-repository";
import { createResumeVersionRepository } from "./resume-version-repository";

describe("resume version repository", () => {
  it("creates, lists and returns the latest resume version for a job", () => {
    const db = openJobpilotDatabase(":memory:");
    const jobs = createJobRepository(db);
    const resumes = createResumeVersionRepository(db);

    const job = jobs.create({
      platform: "boss",
      title: "AI Frontend Engineer",
      jdRaw: "React and TypeScript"
    });

    const first = resumes.create({
      jobId: job.id,
      variant: "tailored",
      markdownContent: "# First",
      selectedExperienceIds: ["exp-1"],
      changeSummary: "First draft.",
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    const second = resumes.create({
      jobId: job.id,
      variant: "tailored",
      markdownContent: "# Second",
      selectedExperienceIds: ["exp-1", "exp-2"],
      changeSummary: "Second draft.",
      createdAt: "2026-01-02T00:00:00.000Z"
    });

    expect(first.id).toBeTruthy();
    expect(resumes.listByJobId(job.id)).toHaveLength(2);
    expect(resumes.getLatestByJobId(job.id)?.id).toBe(second.id);

    db.close();
  });
});
