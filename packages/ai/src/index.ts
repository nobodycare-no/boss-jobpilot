import type {
  ApplicationReviewStrategyRecap,
  ApplicationReviewStrategyRequest,
  CandidatePreference,
  ExperienceItem,
  JobAnalysis,
  JobAnalysisCreateInput,
  JobPosting,
  ResumeVersionCreateInput
} from "@boss-jobpilot/shared";
import {
  ApplicationReviewStrategyRecapSchema,
  JobAnalysisCreateSchema,
  ResumeVersionCreateSchema
} from "@boss-jobpilot/shared";
import { z } from "zod";

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

export type AiProviderHealthStatus = "failed" | "not_configured" | "ok";

export type AiProviderHealth = {
  checkedAt: string;
  configured: boolean;
  detail?: string;
  message: string;
  providerName?: string;
  status: AiProviderHealthStatus;
};

export type OpenAiCompatibleProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  model?: string;
  name?: string;
};

export const promptVersions = {
  jdParser: "jd-parser@0.1.0",
  experienceMatcher: "experience-matcher@0.1.0",
  jobAnalyzer: "job-analyzer@0.1.0",
  resumeWriter: "resume-writer@0.1.0",
  greetingWriter: "greeting-writer@0.1.0",
  applicationReviewStrategist: "application-review-strategist@0.1.0",
  interviewCoach: "interview-coach@0.1.0"
} as const;

const defaultPackyApiBaseUrl = "https://www.packyapi.com/v1";
const defaultPackyApiModel = "gpt-5";
const AiProviderHealthProbeSchema = z.object({
  message: z.string().optional(),
  ok: z.boolean()
});

export function createOpenAiCompatibleProvider({
  apiKey,
  baseUrl = defaultPackyApiBaseUrl,
  fetch: fetchImpl = globalThis.fetch,
  model = defaultPackyApiModel,
  name = "packyapi"
}: OpenAiCompatibleProviderOptions): AiProvider {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    name,
    async generateJson<T>(request: AiJsonRequest): Promise<T> {
      if (!fetchImpl) {
        throw new Error("Fetch API is not available for AI provider requests");
      }

      const response = await fetchImpl(`${normalizedBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: request.messages,
          model: request.model ?? model,
          response_format: {
            type: "json_object"
          },
          temperature: request.temperature ?? 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`AI provider request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("AI provider returned an empty response");
      }

      return JSON.parse(content) as T;
    }
  };
}

export function createAiProviderFromEnv(env: Record<string, string | undefined>) {
  const apiKey = env.AI_API_KEY ?? env.PACKY_API_KEY ?? env.PACKYCODE_API_KEY;

  if (!apiKey) {
    return undefined;
  }

  return createOpenAiCompatibleProvider({
    apiKey,
    baseUrl: env.AI_API_BASE_URL ?? env.AI_BASE_URL ?? env.PACKY_API_BASE_URL ?? defaultPackyApiBaseUrl,
    model: env.AI_MODEL ?? env.PACKY_API_MODEL ?? defaultPackyApiModel,
    name: env.AI_PROVIDER_NAME ?? env.AI_PROVIDER ?? "packyapi"
  });
}

export async function checkAiProviderHealth(
  provider?: AiProvider,
  checkedAt = new Date()
): Promise<AiProviderHealth> {
  const checkedAtIso = checkedAt.toISOString();

  if (!provider) {
    return {
      checkedAt: checkedAtIso,
      configured: false,
      message: "AI Provider 未配置，将使用本地规则版生成。",
      status: "not_configured"
    };
  }

  try {
    const probe = await provider.generateJson<unknown>({
      messages: [
        {
          role: "system",
          content: "You validate an AI provider connection. Return only JSON."
        },
        {
          role: "user",
          content: 'Return {"ok":true,"message":"ready"} as JSON.'
        }
      ],
      temperature: 0
    });
    const parsedProbe = AiProviderHealthProbeSchema.safeParse(probe);

    if (!parsedProbe.success || !parsedProbe.data.ok) {
      return {
        checkedAt: checkedAtIso,
        configured: true,
        detail: parsedProbe.success
          ? (parsedProbe.data.message ?? "AI provider probe returned ok=false")
          : "AI provider probe returned an invalid JSON shape",
        message: "AI Provider 验证失败，将使用本地规则版兜底。",
        providerName: provider.name,
        status: "failed"
      };
    }

    return {
      checkedAt: checkedAtIso,
      configured: true,
      detail: parsedProbe.data.message,
      message: "AI Provider 可用。",
      providerName: provider.name,
      status: "ok"
    };
  } catch (error) {
    return {
      checkedAt: checkedAtIso,
      configured: true,
      detail: error instanceof Error ? error.message : "Unknown AI provider error",
      message: "AI Provider 验证失败，将使用本地规则版兜底。",
      providerName: provider.name,
      status: "failed"
    };
  }
}

export type GreetingDraftInput = {
  job: JobPosting;
  analysis: JobAnalysis;
  experiences: ExperienceItem[];
};

export type JobAnalysisGenerationInput = {
  job: JobPosting;
  preference: CandidatePreference;
  experiences: ExperienceItem[];
  fallbackAnalysis: JobAnalysisCreateInput;
};

export type ResumeVersionGenerationInput = {
  job: JobPosting;
  analysis: JobAnalysis;
  experiences: ExperienceItem[];
  fallbackResume: ResumeVersionCreateInput;
};

export type GreetingDraft = {
  message: string;
  selectedExperienceIds: string[];
  highlights: string[];
  modelName: string;
  promptVersion: string;
};

const GreetingDraftSchema = z.object({
  message: z.string().min(1),
  selectedExperienceIds: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  modelName: z.string().min(1),
  promptVersion: z.string().min(1)
}) satisfies z.ZodType<GreetingDraft>;

export async function generateJobAnalysisWithProvider({
  experiences,
  fallbackAnalysis,
  job,
  preference,
  provider
}: JobAnalysisGenerationInput & {
  provider?: AiProvider;
}): Promise<JobAnalysisCreateInput> {
  if (!provider) {
    return fallbackAnalysis;
  }

  const generated = await provider.generateJson<Partial<JobAnalysisCreateInput>>({
    messages: [
      {
        role: "system",
        content:
          "You are a job application analyst. Return JSON only with fields: jobId, matchScore, recommendation, matchedKeywords, requiredSkills, bonusSkills, matchedExperienceIds, riskFlags, resumeStrategy, modelName, promptVersion."
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "Analyze this Boss Zhipin job for the candidate. Keep recommendation one of prioritize/apply/cautious/skip. Do not invent experience ids; use only candidateExperiences ids. resumeStrategy should be concrete Chinese guidance for tailoring the resume.",
          job,
          preference,
          candidateExperiences: experiences,
          ruleBasedDraft: fallbackAnalysis
        })
      }
    ],
    temperature: 0.2
  });

  return JobAnalysisCreateSchema.parse({
    ...fallbackAnalysis,
    ...generated,
    jobId: job.id,
    matchedExperienceIds: sanitizeExperienceIds(
      generated.matchedExperienceIds ?? fallbackAnalysis.matchedExperienceIds ?? [],
      experiences
    ),
    modelName: generated.modelName || provider.name,
    promptVersion: generated.promptVersion || promptVersions.jobAnalyzer
  });
}

export async function generateResumeVersionWithProvider({
  analysis,
  experiences,
  fallbackResume,
  job,
  provider
}: ResumeVersionGenerationInput & {
  provider?: AiProvider;
}): Promise<ResumeVersionCreateInput> {
  if (!provider) {
    return fallbackResume;
  }

  const selectedExperiences = selectExperiences(experiences, analysis.matchedExperienceIds);
  const generated = await provider.generateJson<Partial<ResumeVersionCreateInput>>({
    messages: [
      {
        role: "system",
        content:
          "You are a resume tailoring assistant. Return JSON only with fields: jobId, variant, markdownContent, selectedExperienceIds, changeSummary."
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "Write a tailored Chinese Markdown resume for this job. Use only the provided real candidate experiences. Do not invent education, employer names, project names, metrics, or experience ids. Keep the Markdown concise but not limited to one page when more relevant evidence is useful.",
          job,
          analysis,
          candidateExperiences: selectedExperiences,
          fallbackResume
        })
      }
    ],
    temperature: 0.25
  });

  return ResumeVersionCreateSchema.parse({
    ...fallbackResume,
    ...generated,
    jobId: job.id,
    variant: "tailored",
    selectedExperienceIds: sanitizeExperienceIds(
      generated.selectedExperienceIds ?? fallbackResume.selectedExperienceIds ?? [],
      experiences
    ),
    changeSummary: generated.changeSummary || fallbackResume.changeSummary
  });
}

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

export async function generateGreetingDraftWithProvider({
  analysis,
  experiences,
  job,
  provider
}: GreetingDraftInput & {
  provider?: AiProvider;
}): Promise<GreetingDraft> {
  if (!provider) {
    return generateGreetingDraft({
      analysis,
      experiences,
      job
    });
  }

  const selectedExperiences = selectExperiences(experiences, analysis.matchedExperienceIds);
  const generated = await provider.generateJson<GreetingDraft>({
    messages: [
      {
        role: "system",
        content:
          "你是求职打招呼语助手。只输出 JSON，字段为 message、selectedExperienceIds、highlights、modelName、promptVersion。不要输出 Markdown。"
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "为 Boss 直聘岗位生成一句自然、克制、具体的中文打招呼语。必须基于给定真实经历，不编造经历、学历、公司或指标。message 控制在 120 字以内。",
          job,
          analysis,
          candidateExperiences: selectedExperiences
        })
      }
    ],
    temperature: 0.3
  });

  return GreetingDraftSchema.parse({
    ...generated,
    modelName: generated.modelName || provider.name,
    promptVersion: generated.promptVersion || promptVersions.greetingWriter
  });
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

export async function generateApplicationReviewStrategyRecapWithProvider({
  input,
  provider
}: {
  input: ApplicationReviewStrategyRequest;
  provider?: AiProvider;
}): Promise<ApplicationReviewStrategyRecap> {
  if (!provider) {
    return generateApplicationReviewStrategyRecap(input);
  }

  const generated = await provider.generateJson<ApplicationReviewStrategyRecap>({
    messages: [
      {
        role: "system",
        content:
          "你是求职投递策略顾问。只输出 JSON，字段为 summary、focus、experiments、risks、modelName、promptVersion。不要输出 Markdown。"
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "基于复盘指标生成下一轮投递策略。summary 用一句话，focus/experiments/risks 各 1-4 条，必须具体可执行。",
          input
        })
      }
    ],
    temperature: 0.2
  });

  return ApplicationReviewStrategyRecapSchema.parse({
    ...generated,
    modelName: generated.modelName || provider.name,
    promptVersion: generated.promptVersion || promptVersions.applicationReviewStrategist
  });
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

function sanitizeExperienceIds(ids: string[], experiences: ExperienceItem[]) {
  const availableIds = new Set(experiences.map((experience) => experience.id));

  return unique(ids).filter((id) => availableIds.has(id)).slice(0, 5);
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
