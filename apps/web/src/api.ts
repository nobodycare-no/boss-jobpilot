import type {
  ExperienceItem,
  ExperienceItemCreateInput,
  JobPosting,
  JobPostingCreateInput
} from "@boss-jobpilot/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

type ExperienceListResponse = {
  items: ExperienceItem[];
};

type ExperienceResponse = {
  item: ExperienceItem;
};

type JobListResponse = {
  items: JobPosting[];
};

type JobResponse = {
  item: JobPosting;
};

export type JobAnalysisResponse = {
  jobId: string;
  score: {
    total: number;
    recommendation: "prioritize" | "apply" | "cautious" | "skip";
    matchedKeywords: string[];
    riskFlags: string[];
  };
};

export async function listExperiences() {
  const response = await fetch(`${apiBaseUrl}/experiences`);

  if (!response.ok) {
    throw new Error("无法加载经历库");
  }

  return (await response.json()) as ExperienceListResponse;
}

export async function createExperience(input: ExperienceItemCreateInput) {
  const response = await fetch(`${apiBaseUrl}/experiences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("无法保存经历");
  }

  return (await response.json()) as ExperienceResponse;
}

export async function updateExperience(id: string, input: ExperienceItemCreateInput) {
  const response = await fetch(`${apiBaseUrl}/experiences/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("无法更新经历");
  }

  return (await response.json()) as ExperienceResponse;
}

export async function deleteExperience(id: string) {
  const response = await fetch(`${apiBaseUrl}/experiences/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("无法删除经历");
  }
}

export async function listJobs() {
  const response = await fetch(`${apiBaseUrl}/jobs`);

  if (!response.ok) {
    throw new Error("无法加载岗位池");
  }

  return (await response.json()) as JobListResponse;
}

export async function createJob(input: JobPostingCreateInput) {
  const response = await fetch(`${apiBaseUrl}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("无法保存岗位");
  }

  return (await response.json()) as JobResponse;
}

export async function deleteJob(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("无法删除岗位");
  }
}

export async function analyzeJob(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/analyze`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("无法分析岗位");
  }

  return (await response.json()) as JobAnalysisResponse;
}
