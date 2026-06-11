import type { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import Fastify from "fastify";
import { z } from "zod";

import {
  checkAiProviderHealth,
  createAiProviderFromEnv,
  generateApplicationReviewStrategyRecap,
  generateApplicationReviewStrategyRecapWithProvider,
  generateGreetingDraft,
  generateGreetingDraftWithProvider,
  generateJobAnalysisWithProvider,
  generateResumeVersionWithProvider,
  type AiProvider
} from "@boss-jobpilot/ai";
import {
  createAiGenerationRunRepository,
  createApplicationRepository,
  createExperienceRepository,
  createJobAnalysisRepository,
  createJobRepository,
  createResumeVersionRepository,
  openJobpilotDatabase
} from "@boss-jobpilot/db";
import { generateTailoredResumeDraft, renderResumeMarkdown } from "@boss-jobpilot/resume";
import { analyzeJobPosting } from "@boss-jobpilot/scoring";
import {
  ExperienceItemCreateSchema,
  ExperienceItemUpdateSchema,
  ApplicationUpdateSchema,
  ApplicationReviewStrategyRequestSchema,
  JobPostingCreateSchema,
  JobPostingSchema,
  JobPostingUpdateSchema,
  GreetingVariantSchema,
  ResumeVariantSchema,
  type Application,
  type ApplicationEvent,
  type AiGenerationRunCreateInput,
  type CandidatePreference,
  type ExperienceItem,
  type GreetingVariant,
  type JobAnalysis,
  type JobPosting,
  type ResumeVariant,
  type ResumeVersion,
  type ResumeVersionCreateInput
} from "@boss-jobpilot/shared";

type BuildServerOptions = {
  aiProvider?: AiProvider;
  database?: DatabaseSync;
  databasePath?: string;
};

type AiFallbackWarning = {
  code: "AI_PROVIDER_FALLBACK";
  message: string;
  detail: string;
};

const defaultCandidatePreference: CandidatePreference = {
  targetRoles: ["AI 应用开发", "前端开发", "全栈开发"],
  targetCities: [],
  preferredKeywords: ["React", "TypeScript", "AI", "Node.js"],
  blockedKeywords: ["外包", "驻场", "培训"]
};

const applicationStatusLabels: Record<Application["status"], string> = {
  applied: "已投递",
  closed: "已关闭",
  draft: "草稿",
  greeted: "已打招呼",
  interview: "面试中",
  offer: "Offer",
  rejected: "已拒绝",
  replied: "已回复"
};

const greetingVariantLabels: Record<GreetingVariant, string> = {
  direct: "主动版",
  evidence: "证据版",
  polite: "礼貌版"
};

const recommendationLabels: Record<JobAnalysis["recommendation"], string> = {
  apply: "可以投递",
  cautious: "谨慎投递",
  prioritize: "优先投递",
  skip: "跳过"
};

const ResumeEditSchema = z.object({
  changeSummary: z.string().optional(),
  markdownContent: z.string().min(1),
  selectedExperienceIds: z.array(z.string()).optional(),
  variant: z.string().min(1).optional()
});

function toEditedResumeVariant(variant?: string) {
  if (!variant) {
    return "edited-manual";
  }

  return `edited-${variant.replace(/^(edited-)+/, "")}`;
}

export function buildServer(options: BuildServerOptions = {}) {
  const database = options.database ?? openJobpilotDatabase(options.databasePath);
  const aiProvider = options.aiProvider;
  const experiences = createExperienceRepository(database);
  const jobs = createJobRepository(database);
  const jobAnalyses = createJobAnalysisRepository(database);
  const resumeVersions = createResumeVersionRepository(database);
  const applications = createApplicationRepository(database);
  const aiGenerationRuns = createAiGenerationRunRepository(database);
  const server = Fastify({
    logger: true
  });

  server.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      return reply.status(204).send();
    }
  });

  server.get("/health", async () => ({
    ok: true,
    service: "boss-jobpilot-api",
    version: "0.1.0"
  }));

  server.get("/ai/provider/health", async () => checkAiProviderHealth(aiProvider));

  server.get("/ai/generation-runs", async () => ({
    items: aiGenerationRuns.listRecent(20)
  }));

  server.get("/experiences", async () => ({
    items: experiences.list()
  }));

  server.get<{ Params: { id: string } }>("/experiences/:id", async (request, reply) => {
    const item = experiences.get(request.params.id);

    if (!item) {
      return reply.status(404).send({
        error: "EXPERIENCE_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.post("/experiences", async (request, reply) => {
    const parsedExperience = ExperienceItemCreateSchema.safeParse(request.body);

    if (!parsedExperience.success) {
      return reply.status(400).send({
        error: "INVALID_EXPERIENCE",
        details: parsedExperience.error.flatten()
      });
    }

    const item = experiences.create(parsedExperience.data);

    return reply.status(201).send({
      item
    });
  });

  server.put<{ Params: { id: string } }>("/experiences/:id", async (request, reply) => {
    const parsedExperience = ExperienceItemUpdateSchema.safeParse(request.body);

    if (!parsedExperience.success) {
      return reply.status(400).send({
        error: "INVALID_EXPERIENCE",
        details: parsedExperience.error.flatten()
      });
    }

    const item = experiences.update(request.params.id, parsedExperience.data);

    if (!item) {
      return reply.status(404).send({
        error: "EXPERIENCE_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.delete<{ Params: { id: string } }>("/experiences/:id", async (request, reply) => {
    const deleted = experiences.delete(request.params.id);

    if (!deleted) {
      return reply.status(404).send({
        error: "EXPERIENCE_NOT_FOUND"
      });
    }

    return reply.status(204).send();
  });

  server.get("/jobs", async () => ({
    items: jobs.list()
  }));

  server.get<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const item = jobs.get(request.params.id);

    if (!item) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.post("/jobs", async (request, reply) => {
    const parsedJob = JobPostingCreateSchema.safeParse(request.body);

    if (!parsedJob.success) {
      return reply.status(400).send({
        error: "INVALID_JOB_POSTING",
        details: parsedJob.error.flatten()
      });
    }

    const item = jobs.create(parsedJob.data);

    return reply.status(201).send({
      item
    });
  });

  server.put<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const parsedJob = JobPostingUpdateSchema.safeParse(request.body);

    if (!parsedJob.success) {
      return reply.status(400).send({
        error: "INVALID_JOB_POSTING",
        details: parsedJob.error.flatten()
      });
    }

    const item = jobs.update(request.params.id, parsedJob.data);

    if (!item) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.delete<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const deleted = jobs.delete(request.params.id);

    if (!deleted) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return reply.status(204).send();
  });

  server.post<{ Params: { id: string } }>("/jobs/:id/analyze", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    const currentExperiences = experiences.list();
    const fallbackAnalysis = analyzeJobPosting(job, defaultCandidatePreference, currentExperiences);
    const generatedAnalysis = await runWithAiFallback({
      fallback: fallbackAnalysis,
      feature: "job-analysis",
      featureLabel: "岗位分析",
      onRecord: (input) => aiGenerationRuns.create(input),
      promptVersion: "job-analyzer@0.1.0",
      provider: aiProvider,
      relatedJobId: job.id,
      run: () =>
        generateJobAnalysisWithProvider({
          job,
          preference: defaultCandidatePreference,
          experiences: currentExperiences,
          fallbackAnalysis,
          provider: aiProvider
        })
    });
    const analysis = jobAnalyses.create(generatedAnalysis.value);

    return {
      jobId: job.id,
      analysis,
      score: analysisToLegacyScore(analysis),
      warnings: generatedAnalysis.warnings
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/analyses", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      items: jobAnalyses.listByJobId(job.id)
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/analysis/latest", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item: jobAnalyses.getLatestByJobId(job.id) ?? null
    };
  });

  server.post("/jobs/analyze", async (request, reply) => {
    const parsedJob = JobPostingSchema.safeParse(request.body);

    if (!parsedJob.success) {
      return reply.status(400).send({
        error: "INVALID_JOB_POSTING",
        details: parsedJob.error.flatten()
      });
    }

    const currentExperiences = experiences.list();
    const fallbackAnalysis = analyzeJobPosting(
      parsedJob.data,
      defaultCandidatePreference,
      currentExperiences
    );
    const analysis = await runWithAiFallback({
      fallback: fallbackAnalysis,
      feature: "instant-job-analysis",
      featureLabel: "岗位分析",
      onRecord: (input) => aiGenerationRuns.create(input),
      promptVersion: "job-analyzer@0.1.0",
      provider: aiProvider,
      relatedJobId: parsedJob.data.id,
      run: () =>
        generateJobAnalysisWithProvider({
          job: parsedJob.data,
          preference: defaultCandidatePreference,
          experiences: currentExperiences,
          fallbackAnalysis,
          provider: aiProvider
        })
    });

    return {
      jobId: parsedJob.data.id,
      analysis: analysis.value,
      score: analysisToLegacyScore(analysis.value),
      warnings: analysis.warnings
    };
  });

  server.post<{ Params: { id: string } }>("/jobs/:id/resumes", async (request, reply) => {
    const variant = parseResumeVariant(request.body);
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    const analysis = jobAnalyses.getLatestByJobId(job.id);

    if (!analysis) {
      return reply.status(409).send({
        error: "ANALYSIS_REQUIRED"
      });
    }

    const currentExperiences = experiences.list();
    const draft = generateTailoredResumeDraft({
      job,
      analysis,
      experiences: currentExperiences,
      variant
    });
    const fallbackResume: ResumeVersionCreateInput = {
      jobId: job.id,
      variant,
      markdownContent: renderResumeMarkdown(draft),
      selectedExperienceIds: draft.experiences.map((experience) => experience.id),
      changeSummary: draft.changeSummary
    };
    const resume = await runWithAiFallback({
      fallback: fallbackResume,
      feature: "resume-generation",
      featureLabel: "定制简历",
      onRecord: (input) => aiGenerationRuns.create(input),
      promptVersion: "resume-writer@0.1.0",
      provider: aiProvider,
      relatedJobId: job.id,
      run: () =>
        generateResumeVersionWithProvider({
          job,
          analysis,
          experiences: currentExperiences,
          fallbackResume,
          provider: aiProvider
        })
    });
    const item = resumeVersions.create({
      ...resume.value
    });

    return reply.status(201).send({
      item,
      warnings: resume.warnings
    });
  });

  server.post<{ Params: { id: string } }>("/jobs/:id/resumes/edits", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    const parsedEdit = ResumeEditSchema.safeParse(request.body);

    if (!parsedEdit.success) {
      return reply.status(400).send({
        error: "INVALID_RESUME_EDIT",
        issues: parsedEdit.error.issues
      });
    }

      const latestResume = resumeVersions.getLatestByJobId(job.id);
      const item = resumeVersions.create({
        jobId: job.id,
        variant: parsedEdit.data.variant ?? toEditedResumeVariant(latestResume?.variant),
        markdownContent: parsedEdit.data.markdownContent,
      selectedExperienceIds:
        parsedEdit.data.selectedExperienceIds ?? latestResume?.selectedExperienceIds ?? [],
      changeSummary: parsedEdit.data.changeSummary ?? "手动编辑 Markdown 简历。"
    });

    return reply.status(201).send({
      item
    });
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/resumes", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      items: resumeVersions.listByJobId(job.id)
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/resume/latest", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item: resumeVersions.getLatestByJobId(job.id) ?? null
    };
  });

  server.post<{ Params: { id: string } }>("/jobs/:id/greetings", async (request, reply) => {
    const variant = parseGreetingVariant(request.body);
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    const analysis = jobAnalyses.getLatestByJobId(job.id);

    if (!analysis) {
      return reply.status(409).send({
        error: "ANALYSIS_REQUIRED"
      });
    }

    const currentExperiences = experiences.list();
    const greeting = await runWithAiFallback({
      fallback: generateGreetingDraft({
        job,
        analysis,
        experiences: currentExperiences,
        variant
      }),
      feature: "greeting-generation",
      featureLabel: "打招呼语",
      onRecord: (input) => aiGenerationRuns.create(input),
      promptVersion: "greeting-writer@0.1.0",
      provider: aiProvider,
      relatedJobId: job.id,
      run: () =>
        generateGreetingDraftWithProvider({
          job,
          analysis,
          experiences: currentExperiences,
          variant,
          provider: aiProvider
        })
    });
    const latestResume = resumeVersions.getLatestByJobId(job.id);
    const item = applications.create({
      jobId: job.id,
      resumeVersionId: latestResume?.id,
      greetingVariant: variant,
      status: "draft",
      greetingMessage: greeting.value.message
    });

    return reply.status(201).send({
      item,
      greeting: greeting.value,
      warnings: greeting.warnings
    });
  });
  server.get<{ Params: { id: string } }>("/jobs/:id/applications", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      items: applications.listByJobId(job.id)
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/application/latest", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item: applications.getLatestByJobId(job.id) ?? null
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/application-package", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    const analysis = jobAnalyses.getLatestByJobId(job.id);
    const resume = resumeVersions.getLatestByJobId(job.id);
    const application = applications.getLatestByJobId(job.id);
    const events = application ? applications.listEventsByApplicationId(application.id) : [];
    const experienceById = new Map(
      experiences.list().map((experience) => [experience.id, experience])
    );

    return {
      item: {
        generatedAt: new Date().toISOString(),
        jobId: job.id,
        markdownContent: buildApplicationPackageMarkdown({
          analysis,
          application,
          events,
          experienceById,
          job,
          resume
        })
      }
    };
  });

  server.patch<{ Params: { id: string } }>("/applications/:id", async (request, reply) => {
    const parsedApplication = ApplicationUpdateSchema.safeParse(request.body);

    if (!parsedApplication.success) {
      return reply.status(400).send({
        error: "INVALID_APPLICATION_UPDATE",
        details: parsedApplication.error.flatten()
      });
    }

    const item = applications.update(request.params.id, parsedApplication.data);

    if (!item) {
      return reply.status(404).send({
        error: "APPLICATION_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.get<{ Params: { id: string } }>("/applications/:id/events", async (request, reply) => {
    const item = applications.get(request.params.id);

    if (!item) {
      return reply.status(404).send({
        error: "APPLICATION_NOT_FOUND"
      });
    }

    return {
      items: applications.listEventsByApplicationId(item.id)
    };
  });

  server.post("/applications/review/strategy", async (request, reply) => {
    const parsedReview = ApplicationReviewStrategyRequestSchema.safeParse(request.body);

    if (!parsedReview.success) {
      return reply.status(400).send({
        error: "INVALID_APPLICATION_REVIEW",
        details: parsedReview.error.flatten()
      });
    }

    const recap = await runWithAiFallback({
      fallback: generateApplicationReviewStrategyRecap(parsedReview.data),
      feature: "application-review-strategy",
      featureLabel: "AI 策略复盘",
      onRecord: (input) => aiGenerationRuns.create(input),
      promptVersion: "application-review-strategist@0.1.0",
      provider: aiProvider,
      run: () =>
        generateApplicationReviewStrategyRecapWithProvider({
          input: parsedReview.data,
          provider: aiProvider
        })
    });

    return {
      item: recap.value,
      warnings: recap.warnings
    };
  });

  return server;
}

function parseResumeVariant(body: unknown): ResumeVariant {
  if (typeof body !== "object" || body === null || !("variant" in body)) {
    return "formal";
  }

  return ResumeVariantSchema.catch("formal").parse((body as { variant?: unknown }).variant);
}

function parseGreetingVariant(body: unknown): GreetingVariant {
  if (typeof body !== "object" || body === null || !("variant" in body)) {
    return "evidence";
  }

  return GreetingVariantSchema.catch("evidence").parse((body as { variant?: unknown }).variant);
}

function buildApplicationPackageMarkdown({
  analysis,
  application,
  events,
  experienceById,
  job,
  resume
}: {
  analysis?: JobAnalysis;
  application?: Application;
  events: ApplicationEvent[];
  experienceById: Map<string, ExperienceItem>;
  job: JobPosting;
  resume?: ResumeVersion;
}) {
  const sections = [
    `# ${job.title} - 投递包`,
    formatPackageSection("岗位信息", [
      ["平台", job.platform],
      ["公司", job.companyName],
      ["城市", job.city],
      ["薪资", job.salaryText],
      ["经验", job.experienceRequirement],
      ["学历", job.educationRequirement],
      ["链接", job.url],
      ["采集时间", formatDateTime(job.capturedAt)]
    ]),
    `## JD\n\n${job.jdRaw || "未填写"}`
  ];

  if (analysis) {
    sections.push(
      formatPackageSection("岗位分析", [
        ["匹配分", `${analysis.matchScore}/100`],
        ["投递建议", recommendationLabels[analysis.recommendation]],
        ["匹配关键词", formatList(analysis.matchedKeywords)],
        ["必需技能", formatList(analysis.requiredSkills)],
        ["加分技能", formatList(analysis.bonusSkills)],
        ["风险信号", formatList(analysis.riskFlags)],
        ["简历策略", analysis.resumeStrategy],
        ["分析时间", formatDateTime(analysis.createdAt)]
      ])
    );

    const matchedExperiences = analysis.matchedExperienceIds
      .map((id) => formatPackageExperience(id, experienceById.get(id)))
      .join("\n\n");

    sections.push(`## 匹配经历\n\n${matchedExperiences || "暂无匹配经历"}`);
  } else {
    sections.push("## 岗位分析\n\n尚未生成岗位分析。");
  }

  if (resume) {
    sections.push(
      formatPackageSection("定制简历元信息", [
        ["版本", resume.variant],
        ["生成时间", formatDateTime(resume.createdAt)],
        ["选用经历", formatList(resume.selectedExperienceIds)],
        ["变更摘要", resume.changeSummary]
      ]),
      `## Markdown 简历\n\n${resume.markdownContent}`
    );
  } else {
    sections.push("## Markdown 简历\n\n尚未生成定制简历。");
  }

  if (application) {
    sections.push(
      formatPackageSection("打招呼语与投递状态", [
        ["话术版本", greetingVariantLabels[application.greetingVariant]],
        ["状态", applicationStatusLabels[application.status]],
        ["创建时间", formatDateTime(application.createdAt)],
        ["更新时间", formatDateTime(application.updatedAt)],
        ["投递时间", application.appliedAt ? formatDateTime(application.appliedAt) : undefined],
        [
          "下次跟进",
          application.nextFollowUpAt ? formatDateTime(application.nextFollowUpAt) : undefined
        ],
        ["结果", application.outcome],
        ["关联简历版本", application.resumeVersionId]
      ]),
      `## 打招呼语\n\n${application.greetingMessage || "暂无打招呼语"}`
    );

    if (events.length > 0) {
      sections.push(
        `## 状态时间线\n\n${events
          .map((event) => `- ${formatDateTime(event.occurredAt)}：${formatApplicationEvent(event)}`)
          .join("\n")}`
      );
    }
  } else {
    sections.push("## 打招呼语与投递状态\n\n尚未生成打招呼语草稿。");
  }

  return sections.join("\n\n");
}

function formatPackageSection(title: string, rows: Array<[string, string | undefined]>) {
  const body = rows
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `- ${label}：${value}`)
    .join("\n");

  return `## ${title}\n\n${body || "暂无信息"}`;
}

function formatPackageExperience(id: string, experience?: ExperienceItem) {
  if (!experience) {
    return `### ${id}\n\n素材已不存在。`;
  }

  return [
    `### ${experience.title}`,
    formatPackageSection("经历详情", [
      ["类型", experience.type],
      ["组织", experience.organization],
      ["角色", experience.role],
      ["时间", [experience.startDate, experience.endDate].filter(Boolean).join(" - ")],
      ["负责程度", experience.ownershipLevel],
      ["真实性", experience.evidenceLevel],
      ["技术栈", formatList(experience.techStack)],
      ["摘要", experience.summary],
      ["职责", formatList(experience.responsibilities)],
      ["成果", formatList(experience.achievements)]
    ])
  ].join("\n\n");
}

function formatApplicationEvent(event: ApplicationEvent) {
  if (event.type === "status_changed" && event.content) {
    try {
      const payload = JSON.parse(event.content) as Partial<{
        from: Application["status"];
        to: Application["status"];
      }>;

      if (payload.from && payload.to) {
        return `状态从 ${applicationStatusLabels[payload.from]} 更新为 ${
          applicationStatusLabels[payload.to]
        }`;
      }
    } catch {
      return event.content;
    }
  }

  return event.content || event.type;
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join("、") : undefined;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function analysisToLegacyScore(analysis: {
  matchScore: number;
  recommendation: "prioritize" | "apply" | "cautious" | "skip";
  matchedKeywords?: string[];
  riskFlags?: string[];
}) {
  return {
    total: analysis.matchScore,
    recommendation: analysis.recommendation,
    matchedKeywords: analysis.matchedKeywords ?? [],
    riskFlags: analysis.riskFlags ?? []
  };
}

async function runWithAiFallback<T>({
  fallback,
  feature,
  featureLabel,
  onRecord,
  promptVersion,
  provider,
  relatedJobId,
  run
}: {
  fallback: T;
  feature: string;
  featureLabel: string;
  onRecord?: (input: AiGenerationRunCreateInput) => void;
  promptVersion?: string;
  provider?: AiProvider;
  relatedJobId?: string;
  run: () => Promise<T>;
}) {
  const startedAt = Date.now();

  if (!provider) {
    recordAiGenerationRun(onRecord, {
      durationMs: Date.now() - startedAt,
      feature,
      ...getAiGenerationMetadata(fallback, {
        modelName: "rule-based",
        promptVersion
      }),
      relatedJobId,
      status: "rule_based"
    });

    return {
      value: fallback,
      warnings: [] satisfies AiFallbackWarning[]
    };
  }

  try {
    const value = await run();
    recordAiGenerationRun(onRecord, {
      durationMs: Date.now() - startedAt,
      feature,
      ...getAiGenerationMetadata(value, {
        modelName: provider.name,
        promptVersion
      }),
      providerName: provider.name,
      relatedJobId,
      status: "provider_success"
    });

    return {
      value,
      warnings: [] satisfies AiFallbackWarning[]
    };
  } catch (error) {
    recordAiGenerationRun(onRecord, {
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : "Unknown AI provider error",
      feature,
      ...getAiGenerationMetadata(fallback, {
        modelName: "rule-based",
        promptVersion
      }),
      providerName: provider.name,
      relatedJobId,
      status: "provider_fallback"
    });

    return {
      value: fallback,
      warnings: [createAiFallbackWarning(featureLabel, error)]
    };
  }
}

function getAiGenerationMetadata(
  value: unknown,
  fallback: { modelName?: string; promptVersion?: string }
) {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const maybeMetadata = value as { modelName?: unknown; promptVersion?: unknown };

  return {
    modelName:
      typeof maybeMetadata.modelName === "string" ? maybeMetadata.modelName : fallback.modelName,
    promptVersion:
      typeof maybeMetadata.promptVersion === "string"
        ? maybeMetadata.promptVersion
        : fallback.promptVersion
  };
}

function recordAiGenerationRun(
  onRecord: ((input: AiGenerationRunCreateInput) => void) | undefined,
  input: AiGenerationRunCreateInput
) {
  try {
    onRecord?.(input);
  } catch (error) {
    console.warn("Failed to record AI generation run", error);
  }
}

function createAiFallbackWarning(featureLabel: string, error: unknown): AiFallbackWarning {
  return {
    code: "AI_PROVIDER_FALLBACK",
    detail: error instanceof Error ? error.message : "Unknown AI provider error",
    message: `${featureLabel}调用 AI Provider 失败，已使用本地规则版结果。`
  };
}

async function main() {
  loadNearestEnvFile();

  const host = process.env.API_HOST ?? "127.0.0.1";
  const port = Number(process.env.API_PORT ?? 4000);
  const server = buildServer({
    aiProvider: createAiProviderFromEnv(process.env),
    databasePath: process.env.DATABASE_PATH
  });

  await server.listen({ host, port });
}

export function loadNearestEnvFile(startDirectory = process.cwd()) {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    const candidate = join(currentDirectory, ".env");

    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return candidate;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (import.meta.url === entrypoint) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
