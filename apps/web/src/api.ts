import type {
  Application,
  ApplicationEvent,
  ApplicationReviewStrategyRecap,
  ApplicationReviewStrategyRequest,
  ApplicationUpdateInput,
  ExperienceItem,
  ExperienceItemCreateInput,
  JobAnalysis,
  JobPosting,
  JobPostingCreateInput,
  ResumeVersion
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

type ResumeVersionResponse = {
  item: ResumeVersion;
};

type ResumeVersionListResponse = {
  items: ResumeVersion[];
};

type ApplicationResponse = {
  item: Application;
};

type ApplicationListResponse = {
  items: Application[];
};

type ApplicationEventListResponse = {
  items: ApplicationEvent[];
};

type ApplicationReviewStrategyResponse = {
  item: ApplicationReviewStrategyRecap;
};

export type JobAnalysisResponse = {
  jobId: string;
  analysis: JobAnalysis;
  score: {
    total: number;
    recommendation: "prioritize" | "apply" | "cautious" | "skip";
    matchedKeywords: string[];
    riskFlags: string[];
  };
};

export type LatestJobAnalysisResponse = {
  item: JobAnalysis | null;
};

export type LatestResumeVersionResponse = {
  item: ResumeVersion | null;
};

export type LatestApplicationResponse = {
  item: Application | null;
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

export async function getLatestJobAnalysis(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/analysis/latest`);

  if (!response.ok) {
    throw new Error("无法加载岗位分析");
  }

  return (await response.json()) as LatestJobAnalysisResponse;
}

export async function generateResume(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/resumes`, {
    method: "POST"
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("请先分析岗位，再生成定制简历");
    }

    throw new Error("无法生成定制简历");
  }

  return (await response.json()) as ResumeVersionResponse;
}

export async function getLatestResume(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/resume/latest`);

  if (!response.ok) {
    throw new Error("无法加载定制简历");
  }

  return (await response.json()) as LatestResumeVersionResponse;
}

export async function listResumes(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/resumes`);

  if (!response.ok) {
    throw new Error("无法加载简历版本");
  }

  return (await response.json()) as ResumeVersionListResponse;
}

export async function generateGreeting(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/greetings`, {
    method: "POST"
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("请先分析岗位，再生成打招呼语");
    }

    throw new Error("无法生成打招呼语");
  }

  return (await response.json()) as ApplicationResponse;
}

export async function getLatestApplication(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/application/latest`);

  if (!response.ok) {
    throw new Error("无法加载投递草稿");
  }

  return (await response.json()) as LatestApplicationResponse;
}

export async function listApplications(id: string) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}/applications`);

  if (!response.ok) {
    throw new Error("无法加载投递草稿版本");
  }

  return (await response.json()) as ApplicationListResponse;
}

export async function updateApplication(id: string, input: ApplicationUpdateInput) {
  const response = await fetch(`${apiBaseUrl}/applications/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("无法更新投递状态");
  }

  return (await response.json()) as ApplicationResponse;
}

export async function getApplicationEvents(id: string) {
  const response = await fetch(`${apiBaseUrl}/applications/${id}/events`);

  if (!response.ok) {
    throw new Error("无法加载投递事件");
  }

  return (await response.json()) as ApplicationEventListResponse;
}

export async function generateApplicationReviewStrategy(input: ApplicationReviewStrategyRequest) {
  const response = await fetch(`${apiBaseUrl}/applications/review/strategy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("无法生成 AI 策略复盘");
  }

  return (await response.json()) as ApplicationReviewStrategyResponse;
}
