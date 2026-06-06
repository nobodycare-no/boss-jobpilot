import { describe, expect, it } from "vitest";

import { createApplicationRepository } from "./application-repository";
import { openJobpilotDatabase } from "./experience-repository";
import { createJobAnalysisRepository } from "./job-analysis-repository";
import { createJobRepository } from "./job-repository";
import { createResumeVersionRepository } from "./resume-version-repository";

describe("job repository", () => {
  it("creates, updates, lists and deletes job postings", () => {
    const db = openJobpilotDatabase(":memory:");
    const repository = createJobRepository(db);

    const created = repository.create({
      platform: "boss",
      title: "前端开发工程师",
      salaryText: "20-35K",
      city: "上海",
      jdRaw: "需要 React、TypeScript 和 Node.js 经验。",
      companyName: "示例科技"
    });

    expect(created.id).toBeTruthy();
    expect(repository.list()).toHaveLength(1);

    const updated = repository.update(created.id, {
      title: "AI 前端开发工程师"
    });

    expect(updated?.title).toBe("AI 前端开发工程师");
    expect(repository.delete(created.id)).toBe(true);
    expect(repository.list()).toHaveLength(0);

    db.close();
  });

  it("deletes a job with generated analyses, resumes and application drafts", () => {
    const db = openJobpilotDatabase(":memory:");
    const jobs = createJobRepository(db);
    const analyses = createJobAnalysisRepository(db);
    const resumes = createResumeVersionRepository(db);
    const applications = createApplicationRepository(db);

    const job = jobs.create({
      platform: "boss",
      title: "AI Frontend Engineer",
      jdRaw: "React TypeScript AI"
    });
    analyses.create({
      jobId: job.id,
      matchScore: 88,
      recommendation: "prioritize",
      matchedKeywords: ["React"],
      requiredSkills: ["React", "TypeScript"],
      matchedExperienceIds: ["exp-1"],
      resumeStrategy: "Lead with matched frontend work."
    });
    const resume = resumes.create({
      jobId: job.id,
      variant: "tailored",
      markdownContent: "# AI Frontend Engineer",
      selectedExperienceIds: ["exp-1"],
      changeSummary: "Highlight React work."
    });
    const application = applications.create({
      jobId: job.id,
      resumeVersionId: resume.id,
      status: "draft",
      greetingMessage: "Hello, I am interested in this role."
    });

    applications.update(application.id, {
      status: "greeted"
    });

    expect(jobs.delete(job.id)).toBe(true);
    expect(jobs.get(job.id)).toBeUndefined();
    expect(analyses.listByJobId(job.id)).toHaveLength(0);
    expect(resumes.listByJobId(job.id)).toHaveLength(0);
    expect(applications.listByJobId(job.id)).toHaveLength(0);
    expect(applications.listEventsByApplicationId(application.id)).toHaveLength(0);

    db.close();
  });
});
