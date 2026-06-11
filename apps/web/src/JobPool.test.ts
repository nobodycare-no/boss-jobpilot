import { describe, expect, it } from "vitest";

import type { Application, JobPosting, ResumeVersion } from "@boss-jobpilot/shared";

import { buildJobPoolSyncSignature, buildVisibleJobKeywords, filterJobsByBoard } from "./JobPool";

describe("JobPool filters", () => {
  const jobs = [
    createJob("job-1", "React 工程师"),
    createJob("job-2", "Node.js 工程师")
  ];
  const greetedApplication = createApplication("app-1", "job-1", "greeted");

  it("returns all jobs after switching back from greeted to all", () => {
    const applicationByJobId = {
      [greetedApplication.jobId]: greetedApplication
    };

    expect(
      filterJobsByBoard({
        applicationByJobId,
        filter: "greeted",
        jobs
      }).map((job) => job.id)
    ).toEqual(["job-1"]);

    expect(
      filterJobsByBoard({
        applicationByJobId,
        filter: "all",
        jobs
      }).map((job) => job.id)
    ).toEqual(["job-1", "job-2"]);
  });

  it("moves jobs out of pending resume after a resume version is generated", () => {
    const resumeHistoryByJobId = {
      "job-1": [createResume("resume-1", "job-1")]
    };

    expect(
      filterJobsByBoard({
        applicationByJobId: {},
        filter: "unstarted",
        jobs,
        resumeHistoryByJobId
      }).map((job) => job.id)
    ).toEqual(["job-2"]);

    expect(
      filterJobsByBoard({
        applicationByJobId: {},
        filter: "resumeReady",
        jobs,
        resumeHistoryByJobId
      }).map((job) => job.id)
    ).toEqual(["job-1"]);
  });

  it("changes the sync signature when a job application status changes", () => {
    const draftApplication = createApplication("app-1", "job-1", "draft");
    const greetedSignature = buildJobPoolSyncSignature(jobs, {
      [greetedApplication.jobId]: greetedApplication
    });
    const draftSignature = buildJobPoolSyncSignature(jobs, {
      [draftApplication.jobId]: draftApplication
    });

    expect(greetedSignature).not.toBe(draftSignature);
  });

  it("uses only job title, salary and city for visible job keywords without duplicates", () => {
    const keywordJobs = [
      {
        ...createJob("job-1", "React 工程师"),
        city: "深圳",
        companyName: "甲公司",
        salaryText: "20-30K"
      },
      {
        ...createJob("job-2", "React 工程师"),
        city: "深圳",
        companyName: "乙公司",
        salaryText: "25-35K"
      }
    ];

    expect(buildVisibleJobKeywords(keywordJobs)).toEqual([
      "React 工程师",
      "20-30K",
      "深圳",
      "25-35K"
    ]);
  });
});

function createJob(id: string, title: string): JobPosting {
  return {
    capturedAt: "2026-06-11T00:00:00.000Z",
    id,
    jdRaw: `${title} 职位描述`,
    platform: "boss",
    title
  };
}

function createResume(id: string, jobId: string): ResumeVersion {
  return {
    changeSummary: "已生成简历",
    createdAt: "2026-06-11T00:00:00.000Z",
    id,
    jobId,
    markdownContent: "# 简历",
    selectedExperienceIds: [],
    variant: "formal"
  };
}

function createApplication(
  id: string,
  jobId: string,
  status: Application["status"]
): Application {
  return {
    createdAt: "2026-06-11T00:00:00.000Z",
    greetingMessage: "你好，我对这个岗位很感兴趣。",
    greetingVariant: "evidence",
    id,
    jobId,
    status,
    updatedAt: `2026-06-11T00:00:0${status === "draft" ? "1" : "2"}.000Z`
  };
}
