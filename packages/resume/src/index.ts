import type { ExperienceItem } from "@boss-jobpilot/shared";

export type ResumeDraft = {
  headline: string;
  summary: string;
  skills: string[];
  experiences: ExperienceItem[];
};

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
    experience.summary ?? "",
    ...experience.responsibilities.map((item) => `- ${item}`),
    ...experience.achievements.map((item) => `- ${item}`)
  ];

  return lines.filter(Boolean).join("\n");
}
