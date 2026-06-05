import type { ExperienceItem, JobAnalysis, JobPosting } from "@boss-jobpilot/shared";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiJsonRequest = {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
};

export type AiProvider = {
  name: string;
  generateJson<T>(request: AiJsonRequest): Promise<T>;
};

export const promptVersions = {
  jdParser: "jd-parser@0.1.0",
  experienceMatcher: "experience-matcher@0.1.0",
  resumeWriter: "resume-writer@0.1.0",
  greetingWriter: "greeting-writer@0.1.0",
  interviewCoach: "interview-coach@0.1.0"
} as const;

export type GreetingDraftInput = {
  job: JobPosting;
  analysis: JobAnalysis;
  experiences: ExperienceItem[];
};

export type GreetingDraft = {
  message: string;
  selectedExperienceIds: string[];
  highlights: string[];
  modelName: string;
  promptVersion: string;
};

export function generateGreetingDraft({ job, analysis, experiences }: GreetingDraftInput) {
  const selectedExperiences = selectExperiences(experiences, analysis.matchedExperienceIds);
  const highlightSkills = unique([
    ...analysis.requiredSkills,
    ...analysis.matchedKeywords,
    ...selectedExperiences.flatMap((experience) => experience.techStack)
  ]).slice(0, 4);
  const primaryExperience = selectedExperiences[0];
  const companyText = job.companyName ? `${job.companyName}的` : "";
  const skillText =
    highlightSkills.length > 0 ? `，和岗位要求中的${highlightSkills.join("、")}比较匹配` : "";
  const experienceText = primaryExperience
    ? `我做过「${primaryExperience.title}」，${summarizeExperience(primaryExperience)}`
    : "我已经根据岗位 JD 整理了相关项目和能力证明";
  const intentText =
    analysis.recommendation === "skip"
      ? "想先了解一下岗位实际职责和团队情况"
      : "希望有机会进一步沟通";

  return {
    message: `您好，我关注到${companyText}${job.title}岗位${skillText}。${experienceText}。${intentText}，谢谢。`,
    selectedExperienceIds: selectedExperiences.map((experience) => experience.id),
    highlights: highlightSkills,
    modelName: "rule-based",
    promptVersion: promptVersions.greetingWriter
  } satisfies GreetingDraft;
}

function selectExperiences(experiences: ExperienceItem[], matchedExperienceIds: string[]) {
  const experienceById = new Map(experiences.map((experience) => [experience.id, experience]));
  const matched = matchedExperienceIds
    .map((id) => experienceById.get(id))
    .filter((experience): experience is ExperienceItem => Boolean(experience));

  if (matched.length > 0) {
    return matched.slice(0, 2);
  }

  return experiences.filter((experience) => experience.evidenceLevel !== "do_not_use").slice(0, 1);
}

function summarizeExperience(experience: ExperienceItem) {
  const evidence = [
    experience.summary,
    experience.achievements[0],
    experience.metrics[0],
    experience.responsibilities[0]
  ].find(Boolean);

  return evidence ?? "可以提供相关项目经验和交付细节";
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
