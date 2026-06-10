import type { ExperienceItem, JobAnalysis, JobPosting, ResumeVariant } from "@boss-jobpilot/shared";

export type ResumeDraft = {
  headline: string;
  summary: string;
  skills: string[];
  experiences: ExperienceItem[];
  changeSummary: string;
  variant: ResumeVariant;
};

export type TailoredResumeInput = {
  job: JobPosting;
  analysis: JobAnalysis;
  experiences: ExperienceItem[];
  variant?: ResumeVariant;
};

const variantLabels = {
  formal: "正式版",
  quick: "快投版",
  technical: "技术版"
} satisfies Record<ResumeVariant, string>;

const variantLimits = {
  formal: { experienceCount: 4, skillCount: 16 },
  quick: { experienceCount: 2, skillCount: 10 },
  technical: { experienceCount: 3, skillCount: 18 }
} satisfies Record<ResumeVariant, { experienceCount: number; skillCount: number }>;

export function generateTailoredResumeDraft({
  job,
  analysis,
  experiences,
  variant = "formal"
}: TailoredResumeInput) {
  const variantLimit = variantLimits[variant];
  const selectedExperiences = selectExperiences(
    experiences,
    analysis.matchedExperienceIds,
    variantLimit.experienceCount
  );
  const skills = unique([
    ...analysis.requiredSkills,
    ...analysis.bonusSkills,
    ...analysis.matchedKeywords,
    ...selectedExperiences.flatMap((experience) => experience.techStack)
  ]).slice(0, variantLimit.skillCount);
  const companyText = job.companyName ? `${job.companyName} ` : "";
  const roleText = `${companyText}${job.title}`.trim();
  const summaryParts = [
    buildVariantSummary(variant),
    `面向 ${roleText} 定制，重点突出与岗位要求直接相关的项目证据。`,
    analysis.resumeStrategy,
    selectedExperiences.length > 0
      ? `优先呈现 ${selectedExperiences.map((experience) => experience.title).join("、")}。`
      : "当前未找到高匹配经历，建议先补充经历库或手动选择可证明能力的项目。"
  ];

  return {
    headline: `${job.title} - ${variantLabels[variant]}简历草稿`,
    summary: summaryParts.filter(Boolean).join(" "),
    skills,
    experiences: selectedExperiences,
    changeSummary: buildChangeSummary(job, analysis, selectedExperiences, variant),
    variant
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

function selectExperiences(
  experiences: ExperienceItem[],
  matchedExperienceIds: string[],
  limit: number
) {
  const experienceById = new Map(experiences.map((experience) => [experience.id, experience]));
  const matched = matchedExperienceIds
    .map((id) => experienceById.get(id))
    .filter((experience): experience is ExperienceItem => Boolean(experience));

  if (matched.length > 0) {
    return matched.slice(0, limit);
  }

  return experiences
    .filter((experience) => experience.evidenceLevel !== "do_not_use")
    .slice(0, limit);
}

function buildChangeSummary(
  job: JobPosting,
  analysis: JobAnalysis,
  selectedExperiences: ExperienceItem[],
  variant: ResumeVariant
) {
  const parts = [
    `生成${variantLabels[variant]}，围绕 ${job.title} 调整标题和摘要。`,
    analysis.requiredSkills.length > 0
      ? `强化 ${analysis.requiredSkills.slice(0, 6).join("、")} 等必需技能。`
      : "",
    selectedExperiences.length > 0
      ? `选用 ${selectedExperiences.map((experience) => experience.title).join("、")} 作为核心经历。`
      : "未选出匹配经历，保留待补充提示。"
  ];

  return parts.filter(Boolean).join(" ");
}

function buildVariantSummary(variant: ResumeVariant) {
  if (variant === "quick") {
    return "快投版控制内容密度，适合快速粘贴到招聘平台或作为一页简历基础。";
  }

  if (variant === "technical") {
    return "技术版强化技术栈、职责和可面试追问的项目证据。";
  }

  return "正式版保留更完整的项目证据，适合导出为两页左右的正式投递简历。";
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
