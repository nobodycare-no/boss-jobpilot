import { describe, expect, it } from "vitest";

import type { JobPosting, JobPostingCreateInput } from "@boss-jobpilot/shared";

import { findMatchingJob, normalizeText, normalizeUrl } from "./job-matching";

describe("job matching", () => {
  const existingJob: JobPosting = {
    capturedAt: "2026-01-01T00:00:00.000Z",
    companyName: "Example Tech",
    id: "job-existing",
    jdRaw: "React TypeScript",
    platform: "boss",
    title: "Frontend Engineer",
    url: "https://www.zhipin.com/job_detail/abc.html?lid=123#chat"
  };

  it("matches jobs by stable URL without query or hash", () => {
    const currentJob: JobPostingCreateInput = {
      jdRaw: "React",
      platform: "boss",
      title: "Different title",
      url: "https://www.zhipin.com/job_detail/abc.html?ka=search#main"
    };

    expect(findMatchingJob(currentJob, [existingJob])?.id).toBe("job-existing");
  });

  it("falls back to title and company when URL is missing", () => {
    const currentJob: JobPostingCreateInput = {
      companyName: "  Example   Tech ",
      jdRaw: "React",
      platform: "boss",
      title: " frontend engineer "
    };

    expect(findMatchingJob(currentJob, [existingJob])?.id).toBe("job-existing");
  });

  it("does not treat blank URLs as a duplicate by themselves", () => {
    const currentJob: JobPostingCreateInput = {
      jdRaw: "Node.js",
      platform: "boss",
      title: "Backend Engineer"
    };
    const jobWithoutUrl: JobPosting = {
      ...existingJob,
      id: "job-without-url",
      title: "Frontend Engineer",
      url: undefined
    };

    expect(findMatchingJob(currentJob, [jobWithoutUrl])).toBeUndefined();
  });

  it("normalizes text and URL values consistently", () => {
    expect(normalizeText("  AI   Frontend  ")).toBe("ai frontend");
    expect(normalizeUrl("https://example.com/path?a=1#top")).toBe("https://example.com/path");
  });
});
