import type { JobPosting, JobPostingCreateInput } from "@boss-jobpilot/shared";

export function findMatchingJob(currentJob: JobPostingCreateInput, jobs: JobPosting[]) {
  const currentUrl = normalizeUrl(currentJob.url);
  const currentTitle = normalizeText(currentJob.title);
  const currentCompany = normalizeText(currentJob.companyName);

  if (currentUrl) {
    const matchedByUrl = jobs.find((job) => normalizeUrl(job.url) === currentUrl);

    if (matchedByUrl) {
      return matchedByUrl;
    }
  }

  return jobs.find(
    (job) =>
      normalizeText(job.title) === currentTitle &&
      (!currentCompany || normalizeText(job.companyName) === currentCompany)
  );
}

export function normalizeUrl(value?: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function normalizeText(value?: string) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}
