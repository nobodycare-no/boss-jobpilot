import type {
  ApplicationReviewStrategyRecap,
  ApplicationReviewStrategyRequest,
  ExperienceItem,
  JobAnalysis,
  JobPosting
} from "@boss-jobpilot/shared";

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
  applicationReviewStrategist: "application-review-strategist@0.1.0",
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

export function generateApplicationReviewStrategyRecap(
  input: ApplicationReviewStrategyRequest
): ApplicationReviewStrategyRecap {
  const replyRate = formatRate(input.replyCount, input.appliedOrBeyond);
  const interviewRate = formatRate(input.interviewOrOffer, input.appliedOrBeyond);
  const matchText =
    input.averageMatchScore === undefined ? "暂无匹配分样本" : `平均匹配分 ${input.averageMatchScore}/100`;
  const strongestSignal = input.attributionSignals[0];
  const primarySuggestion = input.strategySuggestions[0];
  const focus = [
    primarySuggestion?.action,
    input.overdueFollowUps > 0
      ? `先清理 ${input.overdueFollowUps} 个逾期跟进，避免已有机会冷掉。`
      : undefined,
    input.staleActiveApplications > 0
      ? `为 ${input.staleActiveApplications} 个推进中岗位补上下一次动作时间。`
      : undefined,
    strongestSignal
      ? `继续放大“${strongestSignal.groupTitle} / ${strongestSignal.label}”这类已有反馈的方向。`
      : undefined
  ].filter((item): item is string => Boolean(item));
  const experiments = [
    input.generatedPackages < input.activeApplications
      ? "对已有话术但缺少定制简历的岗位补生成简历，再观察回复率变化。"
      : undefined,
    input.appliedOrBeyond >= 3 && input.replyCount / Math.max(input.appliedOrBeyond, 1) < 0.2
      ? "抽样重写 3 条低回复岗位的话术首句，突出项目证据而不是泛泛表达兴趣。"
      : undefined,
    input.averageMatchScore !== undefined && input.averageMatchScore < 60
      ? "下一批只投匹配分更高的岗位，先验证收窄方向能否提升回复。"
      : undefined
  ].filter((item): item is string => Boolean(item));
  const risks = [
    input.totalJobs === 0 ? "当前范围没有岗位样本，复盘结论只适合作为起步提示。" : undefined,
    input.appliedOrBeyond < 3 ? "已投递样本少于 3 个，回复率和面试率暂时不稳定。" : undefined,
    input.averageMatchScore !== undefined && input.averageMatchScore < 60
      ? "匹配分偏低，继续扩大低匹配投递会稀释精力。"
      : undefined,
    input.overdueFollowUps > 0 ? "逾期跟进会影响后续反馈记录的完整性。" : undefined
  ].filter((item): item is string => Boolean(item));

  return {
    summary: `${input.scopeLabel}包含 ${input.totalJobs} 个岗位，${input.appliedOrBeyond} 个已投递及以后，回复率 ${replyRate}，面试转化 ${interviewRate}，${matchText}。`,
    focus: focus.length > 0 ? focus.slice(0, 4) : ["先积累岗位分析、定制简历和投递状态，再进行下一轮策略判断。"],
    experiments:
      experiments.length > 0
        ? experiments.slice(0, 3)
        : ["保持当前投递节奏，下一轮重点记录回复、面试和关闭原因。"],
    risks:
      risks.length > 0
        ? risks.slice(0, 3)
        : ["当前没有明显风险信号，继续用状态和跟进时间保持数据完整。"],
    modelName: "rule-based",
    promptVersion: promptVersions.applicationReviewStrategist
  };
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

function formatRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "-";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
