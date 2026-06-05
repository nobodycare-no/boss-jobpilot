import type { ExperienceItem, JobAnalysis, JobPosting } from "@boss-jobpilot/shared";

export type ResumeDraft = {
  headline: string;
  summary: string;
  skills: string[];
  experiences: ExperienceItem[];
  changeSummary: string;
};

export type TailoredResumeInput = {
  job: JobPosting;
  analysis: JobAnalysis;
  experiences: ExperienceItem[];
};

export function generateTailoredResumeDraft({ job, analysis, experiences }: TailoredResumeInput) {
  const selectedExperiences = selectExperiences(experiences, analysis.matchedExperienceIds);
  const skills = unique([
    ...analysis.requiredSkills,
    ...analysis.bonusSkills,
    ...analysis.matchedKeywords,
    ...selectedExperiences.flatMap((experience) => experience.techStack)
  ]).slice(0, 16);
  const companyText = job.companyName ? `${job.companyName} ` : "";
  const roleText = `${companyText}${job.title}`.trim();
  const summaryParts = [
    `面向 ${roleText} 定制，重点突出与岗位要求直接相关的项目证据。`,
    analysis.resumeStrategy,
    selectedExperiences.length > 0
      ? `优先呈现 ${selectedExperiences.map((experience) => experience.title).join("、")}。`
      : "当前未找到高匹配经历，建议先补充经历库或手动选择可证明能力的项目。"
  ];

  return {
    headline: `${job.title} - 定制简历草稿`,
    summary: summaryParts.filter(Boolean).join(" "),
    skills,
    experiences: selectedExperiences,
    changeSummary: buildChangeSummary(job, analysis, selectedExperiences)
  } satisfies ResumeDraft;
}

export function renderResumeMarkdown(draft: ResumeDraft) {
  const sections = [
    `# ${draft.headline}`,
    draft.summary,
    `## 技能\n\n${draft.skills.map((skill) => `- ${skill}`).join("\n")}`,
    `## 经历\n\n${draft.experiences.map(renderExperience).join("\n\n")}`
  ];

  return sections.filter(Boolean).join("\n\n");
}

function renderExperience(experience: ExperienceItem) {
  const lines = [
    `### ${experience.title}`,
    experience.organization ? `**组织**：${experience.organization}` : "",
    experience.role ? `**角色**：${experience.role}` : "",
    renderDateRange(experience),
    experience.summary ?? "",
    ...experience.responsibilities.map((item) => `- ${item}`),
    ...experience.achievements.map((item) => `- ${item}`),
    ...experience.metrics.map((item) => `- ${item}`)
  ];

  return lines.filter(Boolean).join("\n");
}

function selectExperiences(experiences: ExperienceItem[], matchedExperienceIds: string[]) {
  const experienceById = new Map(experiences.map((experience) => [experience.id, experience]));
  const matched = matchedExperienceIds
    .map((id) => experienceById.get(id))
    .filter((experience): experience is ExperienceItem => Boolean(experience));

  if (matched.length > 0) {
    return matched;
  }

  return experiences.filter((experience) => experience.evidenceLevel !== "do_not_use").slice(0, 3);
}

function buildChangeSummary(
  job: JobPosting,
  analysis: JobAnalysis,
  selectedExperiences: ExperienceItem[]
) {
  const parts = [
    `围绕 ${job.title} 调整标题和摘要。`,
    analysis.requiredSkills.length > 0
      ? `强化 ${analysis.requiredSkills.slice(0, 6).join("、")} 等必需技能。`
      : "",
    selectedExperiences.length > 0
      ? `选用 ${selectedExperiences.map((experience) => experience.title).join("、")} 作为核心经历。`
      : "未选出匹配经历，保留待补充提示。"
  ];

  return parts.filter(Boolean).join(" ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function renderDateRange(experience: ExperienceItem) {
  if (!experience.startDate && !experience.endDate) {
    return "";
  }

  return `**时间**：${experience.startDate ?? "未知"} - ${experience.endDate ?? "至今"}`;
}
