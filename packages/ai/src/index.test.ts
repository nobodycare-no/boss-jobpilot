import { describe, expect, it } from "vitest";

import {
  checkAiProviderHealth,
  createAiProviderFromEnv,
  createOpenAiCompatibleProvider,
  generateApplicationReviewStrategyRecap,
  generateApplicationReviewStrategyRecapWithProvider,
  generateGreetingDraft,
  generateGreetingDraftWithProvider,
  generateJobAnalysisWithProvider,
  generateResumeVersionWithProvider,
  promptVersions
} from "./index";

describe("job analysis generation", () => {
  it("uses an AI provider for job analysis and filters hallucinated experience ids", async () => {
    const analysis = await generateJobAnalysisWithProvider({
      job: {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: "React TypeScript AI product workflow",
        companyName: "Example Tech",
        capturedAt: "2026-01-01T00:00:00.000Z"
      },
      preference: {
        targetRoles: ["Frontend Engineer"],
        targetCities: [],
        preferredKeywords: ["React", "TypeScript", "AI"],
        blockedKeywords: []
      },
      experiences: [
        {
          id: "exp-1",
          type: "project",
          title: "AI resume tailoring workspace",
          summary: "Built React and TypeScript workflow for AI job applications.",
          techStack: ["React", "TypeScript"],
          responsibilities: [],
          achievements: [],
          metrics: [],
          evidenceLevel: "deep_interview_ready",
          ownershipLevel: "owned",
          tags: []
        }
      ],
      fallbackAnalysis: {
        jobId: "job-1",
        matchScore: 70,
        recommendation: "apply",
        matchedKeywords: ["React"],
        requiredSkills: ["React"],
        bonusSkills: [],
        matchedExperienceIds: ["exp-1"],
        riskFlags: [],
        resumeStrategy: "Rule based strategy.",
        modelName: "rule-based",
        promptVersion: "rule-based-job-analysis@0.1.0"
      },
      provider: {
        name: "test-provider",
        async generateJson<T>() {
          return {
            jobId: "wrong-job",
            matchScore: 91,
            recommendation: "prioritize",
            matchedKeywords: ["React", "TypeScript", "AI"],
            requiredSkills: ["React", "TypeScript", "AI"],
            bonusSkills: ["RAG"],
            matchedExperienceIds: ["exp-1", "missing-exp"],
            riskFlags: [],
            resumeStrategy: "Prioritize the AI resume tailoring workspace and React delivery.",
            modelName: "test-model",
            promptVersion: "test-analysis"
          } as T;
        }
      }
    });

    expect(analysis.jobId).toBe("job-1");
    expect(analysis.matchScore).toBe(91);
    expect(analysis.recommendation).toBe("prioritize");
    expect(analysis.matchedExperienceIds).toEqual(["exp-1"]);
    expect(analysis.modelName).toBe("test-model");
  });
});

describe("resume version generation", () => {
  it("uses an AI provider for resume markdown and filters hallucinated experience ids", async () => {
    const resume = await generateResumeVersionWithProvider({
      job: {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: "React TypeScript AI",
        companyName: "Example Tech",
        capturedAt: "2026-01-01T00:00:00.000Z"
      },
      analysis: {
        id: "analysis-1",
        jobId: "job-1",
        matchScore: 91,
        recommendation: "prioritize",
        matchedKeywords: ["React", "TypeScript", "AI"],
        requiredSkills: ["React", "TypeScript", "AI"],
        bonusSkills: [],
        matchedExperienceIds: ["exp-1"],
        riskFlags: [],
        resumeStrategy: "Lead with AI frontend delivery.",
        modelName: "test-model",
        promptVersion: "test-analysis",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      experiences: [
        {
          id: "exp-1",
          type: "project",
          title: "AI resume tailoring workspace",
          summary: "Built React and TypeScript workflow for AI job applications.",
          techStack: ["React", "TypeScript"],
          responsibilities: ["Built the resume tailoring UI"],
          achievements: ["Reduced manual drafting time"],
          metrics: ["Saved 70% drafting time"],
          evidenceLevel: "deep_interview_ready",
          ownershipLevel: "owned",
          tags: []
        }
      ],
      fallbackResume: {
        jobId: "job-1",
        variant: "tailored",
        markdownContent: "# Rule based resume",
        selectedExperienceIds: ["exp-1"],
        changeSummary: "Rule based change summary."
      },
      provider: {
        name: "test-provider",
        async generateJson<T>() {
          return {
            jobId: "wrong-job",
            variant: "provider",
            markdownContent:
              "# Provider generated resume\n\n## Project\n\nAI resume tailoring workspace with React.",
            selectedExperienceIds: ["exp-1", "missing-exp"],
            changeSummary: "Provider emphasized React and AI resume tailoring."
          } as T;
        }
      }
    });

    expect(resume.jobId).toBe("job-1");
    expect(resume.variant).toBe("tailored");
    expect(resume.markdownContent).toContain("Provider generated resume");
    expect(resume.selectedExperienceIds).toEqual(["exp-1"]);
    expect(resume.changeSummary).toContain("Provider emphasized");
  });
});

describe("greeting draft generation", () => {
  it("generates a personalized greeting from job analysis and matched experience", () => {
    const draft = generateGreetingDraft({
      job: {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: "React TypeScript AI",
        companyName: "Example Tech",
        capturedAt: "2026-01-01T00:00:00.000Z"
      },
      analysis: {
        id: "analysis-1",
        jobId: "job-1",
        matchScore: 88,
        recommendation: "prioritize",
        matchedKeywords: ["React", "TypeScript"],
        requiredSkills: ["React", "TypeScript", "AI"],
        bonusSkills: [],
        matchedExperienceIds: ["exp-1"],
        riskFlags: [],
        resumeStrategy: "Lead with AI frontend work.",
        modelName: "rule-based",
        promptVersion: "rule-based-job-analysis@0.1.0",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      experiences: [
        {
          id: "exp-1",
          type: "project",
          title: "AI resume tailoring workspace",
          summary: "Built React and TypeScript workflow for AI job applications.",
          techStack: ["React", "TypeScript", "Node.js"],
          responsibilities: [],
          achievements: [],
          metrics: [],
          evidenceLevel: "deep_interview_ready",
          ownershipLevel: "owned",
          tags: []
        }
      ]
    });

    expect(draft.message).toContain("Example Tech");
    expect(draft.message).toContain("AI resume tailoring workspace");
    expect(draft.selectedExperienceIds).toEqual(["exp-1"]);
    expect(draft.promptVersion).toBe(promptVersions.greetingWriter);
  });

  it("uses an AI provider for greeting generation when supplied", async () => {
    const draft = await generateGreetingDraftWithProvider({
      job: {
        id: "job-1",
        platform: "boss",
        title: "AI Frontend Engineer",
        jdRaw: "React TypeScript AI",
        companyName: "Example Tech",
        capturedAt: "2026-01-01T00:00:00.000Z"
      },
      analysis: {
        id: "analysis-1",
        jobId: "job-1",
        matchScore: 88,
        recommendation: "prioritize",
        matchedKeywords: ["React", "TypeScript"],
        requiredSkills: ["React", "TypeScript", "AI"],
        bonusSkills: [],
        matchedExperienceIds: ["exp-1"],
        riskFlags: [],
        resumeStrategy: "Lead with AI frontend work.",
        modelName: "rule-based",
        promptVersion: "rule-based-job-analysis@0.1.0",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      experiences: [
        {
          id: "exp-1",
          type: "project",
          title: "AI resume tailoring workspace",
          summary: "Built React and TypeScript workflow for AI job applications.",
          techStack: ["React", "TypeScript"],
          responsibilities: [],
          achievements: [],
          metrics: [],
          evidenceLevel: "deep_interview_ready",
          ownershipLevel: "owned",
          tags: []
        }
      ],
      provider: {
        name: "test-provider",
        async generateJson<T>() {
          return {
            message: "您好，我做过 AI resume tailoring workspace，和岗位 React、TypeScript 要求匹配，想进一步沟通。",
            selectedExperienceIds: ["exp-1"],
            highlights: ["React", "TypeScript"],
            modelName: "test-model",
            promptVersion: "test-greeting"
          } as T;
        }
      }
    });

    expect(draft.message).toContain("AI resume tailoring workspace");
    expect(draft.modelName).toBe("test-model");
    expect(draft.selectedExperienceIds).toEqual(["exp-1"]);
  });
});

describe("application review strategy recap", () => {
  it("generates a structured recap from review metrics and signals", () => {
    const recap = generateApplicationReviewStrategyRecap({
      activeApplications: 4,
      appliedOrBeyond: 3,
      averageMatchScore: 72,
      generatedPackages: 2,
      interviewOrOffer: 1,
      overdueFollowUps: 1,
      replyCount: 2,
      staleActiveApplications: 1,
      totalJobs: 5,
      scopeLabel: "上海 / 优先投递",
      strategySuggestions: [
        {
          action: "先处理逾期跟进。",
          detail: "1 个岗位已经逾期。",
          priority: "high",
          title: "先处理逾期跟进"
        }
      ],
      attributionSignals: [
        {
          appliedOrBeyond: 2,
          groupTitle: "公司类型",
          interviewOrOffer: 1,
          label: "科技产品",
          replyCount: 2
        }
      ]
    });

    expect(recap.summary).toContain("上海 / 优先投递");
    expect(recap.summary).toContain("回复率 67%");
    expect(recap.focus).toContain("先处理逾期跟进。");
    expect(recap.experiments.join(" ")).toContain("补生成简历");
    expect(recap.modelName).toBe("rule-based");
    expect(recap.promptVersion).toBe(promptVersions.applicationReviewStrategist);
  });

  it("uses an AI provider when one is supplied", async () => {
    const recap = await generateApplicationReviewStrategyRecapWithProvider({
      input: {
        activeApplications: 1,
        appliedOrBeyond: 1,
        generatedPackages: 1,
        interviewOrOffer: 0,
        overdueFollowUps: 0,
        replyCount: 0,
        staleActiveApplications: 0,
        totalJobs: 1,
        scopeLabel: "全部岗位",
        strategySuggestions: [],
        attributionSignals: []
      },
      provider: {
        name: "test-provider",
        async generateJson<T>() {
          return {
            summary: "全部岗位样本较少，先补齐反馈记录。",
            focus: ["记录下一次跟进时间。"],
            experiments: ["对比两版打招呼语。"],
            risks: ["样本量偏少。"],
            modelName: "test-model",
            promptVersion: "test-prompt"
          } as T;
        }
      }
    });

    expect(recap.modelName).toBe("test-model");
    expect(recap.focus).toEqual(["记录下一次跟进时间。"]);
  });
});

describe("OpenAI compatible provider", () => {
  it("reports an unconfigured provider health state", async () => {
    await expect(checkAiProviderHealth(undefined, new Date("2026-06-09T00:00:00.000Z"))).resolves.toEqual({
      checkedAt: "2026-06-09T00:00:00.000Z",
      configured: false,
      message: "AI Provider 未配置，将使用本地规则版生成。",
      status: "not_configured"
    });
  });

  it("checks a configured provider with a minimal JSON probe", async () => {
    const health = await checkAiProviderHealth(
      {
        name: "test-provider",
        async generateJson<T>() {
          return {
            message: "ready",
            ok: true
          } as T;
        }
      },
      new Date("2026-06-09T00:00:00.000Z")
    );

    expect(health).toEqual({
      checkedAt: "2026-06-09T00:00:00.000Z",
      configured: true,
      detail: "ready",
      message: "AI Provider 可用。",
      providerName: "test-provider",
      status: "ok"
    });
  });

  it("reports provider probe failures without throwing", async () => {
    const health = await checkAiProviderHealth(
      {
        name: "failing-provider",
        async generateJson<T>(): Promise<T> {
          throw new Error("network unavailable");
        }
      },
      new Date("2026-06-09T00:00:00.000Z")
    );

    expect(health).toMatchObject({
      checkedAt: "2026-06-09T00:00:00.000Z",
      configured: true,
      detail: "network unavailable",
      message: "AI Provider 验证失败，将使用本地规则版兜底。",
      providerName: "failing-provider",
      status: "failed"
    });
  });

  it("creates a PackyAPI provider from environment variables", () => {
    const provider = createAiProviderFromEnv({
      AI_API_KEY: "test-key",
      AI_MODEL: "gpt-5",
      AI_PROVIDER_NAME: "packyapi-test"
    });

    expect(provider?.name).toBe("packyapi-test");
  });

  it("accepts Packy-specific and legacy environment aliases", () => {
    const provider = createAiProviderFromEnv({
      AI_BASE_URL: "https://legacy.example/v1",
      AI_PROVIDER: "packy-legacy",
      PACKY_API_KEY: "test-key"
    });

    expect(provider?.name).toBe("packy-legacy");
  });

  it("calls the chat completions endpoint and parses JSON content", async () => {
    const calls: Array<{ body: string; headers: Record<string, string>; url: string }> = [];
    const provider = createOpenAiCompatibleProvider({
      apiKey: "test-key",
      baseUrl: "https://www.packyapi.com/v1/",
      fetch: async (url, init) => {
        calls.push({
          body: String(init?.body),
          headers: init?.headers as Record<string, string>,
          url: String(url)
        });

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    ok: true
                  })
                }
              }
            ]
          }),
          {
            status: 200
          }
        );
      },
      model: "gpt-5"
    });

    await expect(
      provider.generateJson({
        messages: [{ role: "user", content: "Return JSON." }]
      })
    ).resolves.toEqual({ ok: true });
    const [call] = calls;

    expect(call).toBeDefined();
    expect(call?.url).toBe("https://www.packyapi.com/v1/chat/completions");
    expect(call?.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(call?.body ?? "{}")).toMatchObject({
      model: "gpt-5",
      response_format: {
        type: "json_object"
      }
    });
  });
});
