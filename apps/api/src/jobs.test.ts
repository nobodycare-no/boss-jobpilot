import { afterAll, describe, expect, it } from "vitest";

import { openJobpilotDatabase } from "@boss-jobpilot/db";
import type { AiJsonRequest } from "@boss-jobpilot/ai";

import { buildServer } from "./index";

const db = openJobpilotDatabase(":memory:");
const server = buildServer({ database: db });
const providerDb = openJobpilotDatabase(":memory:");
const providerServer = buildServer({
  database: providerDb,
  aiProvider: {
    name: "test-provider",
    async generateJson<T>(request: AiJsonRequest) {
      const promptText = request.messages.map((message) => message.content).join("\n");

      if (promptText.includes("validate an AI provider connection")) {
        return {
          message: "ready",
          ok: true
        } as T;
      }

      if (promptText.includes("job application analyst")) {
        return {
          jobId: "provider-job",
          matchScore: 93,
          recommendation: "prioritize",
          matchedKeywords: ["React", "TypeScript"],
          requiredSkills: ["React", "TypeScript"],
          bonusSkills: ["AI"],
          matchedExperienceIds: ["exp-provider"],
          riskFlags: [],
          resumeStrategy: "Use the provider backed React workflow as the lead experience.",
          modelName: "test-analysis-model",
          promptVersion: "test-analysis"
        } as T;
      }

      if (promptText.includes("resume tailoring assistant")) {
        return {
          jobId: "provider-job",
          variant: "provider",
          markdownContent:
            "# Provider generated resume\n\n## Project\n\nProvider backed greeting with React workflow.",
          selectedExperienceIds: ["exp-provider", "missing-exp"],
          changeSummary: "Provider generated a tailored resume around the React workflow."
        } as T;
      }

      return {
        message: "您好，我基于真实项目经历匹配这个岗位，想进一步沟通。",
        selectedExperienceIds: ["exp-provider"],
        highlights: ["React"],
        modelName: "test-provider-model",
        promptVersion: "test-greeting"
      } as T;
    }
  }
});
const failingProviderDb = openJobpilotDatabase(":memory:");
const failingProviderServer = buildServer({
  database: failingProviderDb,
  aiProvider: {
    name: "failing-provider",
    async generateJson<T>(): Promise<T> {
      throw new Error("provider unavailable");
    }
  }
});

describe("job routes", () => {
  afterAll(async () => {
    await server.close();
    db.close();
    await providerServer.close();
    providerDb.close();
    await failingProviderServer.close();
    failingProviderDb.close();
  });

  it("creates, lists, analyzes and persists jobs", async () => {
    const experienceResponse = await server.inject({
      method: "POST",
      url: "/experiences",
      payload: {
        id: "exp-ai-frontend",
        type: "project",
        title: "AI resume tailoring workspace",
        role: "Frontend Engineer",
        summary: "Built React and TypeScript UI with Node.js APIs and AI integrations.",
        techStack: ["React", "TypeScript", "Node.js", "AI"],
        responsibilities: ["Implemented job analysis workflow"],
        achievements: ["Reduced manual resume tailoring time"],
        evidenceLevel: "deep_interview_ready",
        ownershipLevel: "owned"
      }
    });

    expect(experienceResponse.statusCode).toBe(201);

    const createResponse = await server.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        platform: "boss",
        title: "AI Frontend Engineer",
        salaryText: "20-35K",
        city: "Shanghai",
        jdRaw: "Build React, TypeScript, Node.js and AI API integrations.",
        companyName: "Example Tech"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json().item;

    const listResponse = await server.inject({
      method: "GET",
      url: "/jobs"
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);

    const analysisResponse = await server.inject({
      method: "POST",
      url: `/jobs/${created.id}/analyze`
    });

    expect(analysisResponse.statusCode).toBe(200);
    expect(analysisResponse.json().analysis.recommendation).toBe("prioritize");
    expect(analysisResponse.json().analysis.requiredSkills).toContain("React");
    expect(analysisResponse.json().analysis.matchedExperienceIds).toEqual(["exp-ai-frontend"]);

    const latestResponse = await server.inject({
      method: "GET",
      url: `/jobs/${created.id}/analysis/latest`
    });

    expect(latestResponse.statusCode).toBe(200);
    expect(latestResponse.json().item.id).toBe(analysisResponse.json().analysis.id);

    const analysesResponse = await server.inject({
      method: "GET",
      url: `/jobs/${created.id}/analyses`
    });

    expect(analysesResponse.statusCode).toBe(200);
    expect(analysesResponse.json().items).toHaveLength(1);

    const resumeResponse = await server.inject({
      method: "POST",
      url: `/jobs/${created.id}/resumes`
    });

    expect(resumeResponse.statusCode).toBe(201);
    expect(resumeResponse.json().item.markdownContent).toContain("AI Frontend Engineer");
    expect(resumeResponse.json().item.selectedExperienceIds).toEqual(["exp-ai-frontend"]);

    const latestResumeResponse = await server.inject({
      method: "GET",
      url: `/jobs/${created.id}/resume/latest`
    });

    expect(latestResumeResponse.statusCode).toBe(200);
    expect(latestResumeResponse.json().item.id).toBe(resumeResponse.json().item.id);

    const resumeListResponse = await server.inject({
      method: "GET",
      url: `/jobs/${created.id}/resumes`
    });

    expect(resumeListResponse.statusCode).toBe(200);
    expect(resumeListResponse.json().items).toHaveLength(1);

    const greetingResponse = await server.inject({
      method: "POST",
      url: `/jobs/${created.id}/greetings`
    });

    expect(greetingResponse.statusCode).toBe(201);
    expect(greetingResponse.json().item.status).toBe("draft");
    expect(greetingResponse.json().item.greetingMessage).toContain("AI Frontend Engineer");
    expect(greetingResponse.json().item.resumeVersionId).toBe(resumeResponse.json().item.id);

    const latestApplicationResponse = await server.inject({
      method: "GET",
      url: `/jobs/${created.id}/application/latest`
    });

    expect(latestApplicationResponse.statusCode).toBe(200);
    expect(latestApplicationResponse.json().item.id).toBe(greetingResponse.json().item.id);

    const applicationListResponse = await server.inject({
      method: "GET",
      url: `/jobs/${created.id}/applications`
    });

    expect(applicationListResponse.statusCode).toBe(200);
    expect(applicationListResponse.json().items).toHaveLength(1);

    const updateApplicationResponse = await server.inject({
      method: "PATCH",
      url: `/applications/${greetingResponse.json().item.id}`,
      payload: {
        status: "greeted"
      }
    });

    expect(updateApplicationResponse.statusCode).toBe(200);
    expect(updateApplicationResponse.json().item.status).toBe("greeted");

    const followUpResponse = await server.inject({
      method: "PATCH",
      url: `/applications/${greetingResponse.json().item.id}`,
      payload: {
        nextFollowUpAt: "2026-01-04T02:00:00.000Z"
      }
    });

    expect(followUpResponse.statusCode).toBe(200);
    expect(followUpResponse.json().item.nextFollowUpAt).toBe("2026-01-04T02:00:00.000Z");

    const clearFollowUpResponse = await server.inject({
      method: "PATCH",
      url: `/applications/${greetingResponse.json().item.id}`,
      payload: {
        nextFollowUpAt: null
      }
    });

    expect(clearFollowUpResponse.statusCode).toBe(200);
    expect(clearFollowUpResponse.json().item.nextFollowUpAt).toBeUndefined();

    const applicationEventsResponse = await server.inject({
      method: "GET",
      url: `/applications/${greetingResponse.json().item.id}/events`
    });

    expect(applicationEventsResponse.statusCode).toBe(200);
    expect(applicationEventsResponse.json().items).toHaveLength(1);
    expect(applicationEventsResponse.json().items[0].type).toBe("status_changed");

    const reviewStrategyResponse = await server.inject({
      method: "POST",
      url: "/applications/review/strategy",
      payload: {
        activeApplications: 1,
        appliedOrBeyond: 1,
        averageMatchScore: 88,
        generatedPackages: 1,
        interviewOrOffer: 0,
        overdueFollowUps: 0,
        replyCount: 0,
        staleActiveApplications: 1,
        totalJobs: 1,
        scopeLabel: "全部岗位",
        strategySuggestions: [
          {
            action: "为推进中的岗位补上明确的下次跟进时间。",
            detail: "1 个岗位没有跟进提醒。",
            priority: "high",
            title: "补齐下次跟进"
          }
        ],
        attributionSignals: [
          {
            appliedOrBeyond: 1,
            groupTitle: "岗位类型",
            interviewOrOffer: 0,
            label: "AI / 算法",
            replyCount: 0
          }
        ]
      }
    });

    expect(reviewStrategyResponse.statusCode).toBe(200);
    expect(reviewStrategyResponse.json().item.summary).toContain("全部岗位");
    expect(reviewStrategyResponse.json().item.focus[0]).toContain("补上明确的下次跟进");
    expect(reviewStrategyResponse.json().item.modelName).toBe("rule-based");

    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/jobs/${created.id}`
    });

    expect(deleteResponse.statusCode).toBe(204);

    const listAfterDeleteResponse = await server.inject({
      method: "GET",
      url: "/jobs"
    });

    expect(listAfterDeleteResponse.statusCode).toBe(200);
    expect(listAfterDeleteResponse.json().items).toHaveLength(0);
  });

  it("reports AI provider health states", async () => {
    const unconfiguredHealthResponse = await server.inject({
      method: "GET",
      url: "/ai/provider/health"
    });

    expect(unconfiguredHealthResponse.statusCode).toBe(200);
    expect(unconfiguredHealthResponse.json()).toMatchObject({
      configured: false,
      status: "not_configured"
    });

    const configuredHealthResponse = await providerServer.inject({
      method: "GET",
      url: "/ai/provider/health"
    });

    expect(configuredHealthResponse.statusCode).toBe(200);
    expect(configuredHealthResponse.json()).toMatchObject({
      configured: true,
      detail: "ready",
      providerName: "test-provider",
      status: "ok"
    });

    const failedHealthResponse = await failingProviderServer.inject({
      method: "GET",
      url: "/ai/provider/health"
    });

    expect(failedHealthResponse.statusCode).toBe(200);
    expect(failedHealthResponse.json()).toMatchObject({
      configured: true,
      detail: "provider unavailable",
      providerName: "failing-provider",
      status: "failed"
    });
  });

  it("uses the configured AI provider for analysis, resume and greeting generation", async () => {
    await providerServer.inject({
      method: "POST",
      url: "/experiences",
      payload: {
        id: "exp-provider",
        type: "project",
        title: "Provider backed greeting",
        summary: "Built React workflow.",
        techStack: ["React"],
        responsibilities: [],
        achievements: [],
        metrics: [],
        evidenceLevel: "deep_interview_ready",
        ownershipLevel: "owned"
      }
    });
    const createResponse = await providerServer.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        platform: "boss",
        title: "Frontend Engineer",
        jdRaw: "React TypeScript",
        companyName: "Example Tech"
      }
    });
    const created = createResponse.json().item;

    const analysisResponse = await providerServer.inject({
      method: "POST",
      url: `/jobs/${created.id}/analyze`
    });

    expect(analysisResponse.statusCode).toBe(200);
    expect(analysisResponse.json().analysis.matchScore).toBe(93);
    expect(analysisResponse.json().analysis.modelName).toBe("test-analysis-model");

    const resumeResponse = await providerServer.inject({
      method: "POST",
      url: `/jobs/${created.id}/resumes`
    });

    expect(resumeResponse.statusCode).toBe(201);
    expect(resumeResponse.json().item.markdownContent).toContain("Provider generated resume");
    expect(resumeResponse.json().item.selectedExperienceIds).toEqual(["exp-provider"]);
    expect(resumeResponse.json().item.variant).toBe("tailored");

    const greetingResponse = await providerServer.inject({
      method: "POST",
      url: `/jobs/${created.id}/greetings`
    });

    expect(greetingResponse.statusCode).toBe(201);
    expect(greetingResponse.json().item.resumeVersionId).toBe(resumeResponse.json().item.id);
    expect(greetingResponse.json().item.greetingMessage).toBe(
      "您好，我基于真实项目经历匹配这个岗位，想进一步沟通。"
    );
    expect(greetingResponse.json().greeting.modelName).toBe("test-provider-model");
  });

  it("falls back to rule-based generation when the configured AI provider fails", async () => {
    await failingProviderServer.inject({
      method: "POST",
      url: "/experiences",
      payload: {
        id: "exp-fallback",
        type: "project",
        title: "Fallback workflow",
        summary: "Built React and TypeScript workflow.",
        techStack: ["React", "TypeScript"],
        responsibilities: [],
        achievements: [],
        metrics: [],
        evidenceLevel: "deep_interview_ready",
        ownershipLevel: "owned"
      }
    });
    const createResponse = await failingProviderServer.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        platform: "boss",
        title: "Frontend Engineer",
        jdRaw: "React TypeScript",
        companyName: "Example Tech"
      }
    });
    const created = createResponse.json().item;

    const analysisResponse = await failingProviderServer.inject({
      method: "POST",
      url: `/jobs/${created.id}/analyze`
    });

    expect(analysisResponse.statusCode).toBe(200);
    expect(analysisResponse.json().analysis.modelName).toBe("rule-based");
    expect(analysisResponse.json().warnings[0]).toMatchObject({
      code: "AI_PROVIDER_FALLBACK",
      detail: "provider unavailable"
    });

    const resumeResponse = await failingProviderServer.inject({
      method: "POST",
      url: `/jobs/${created.id}/resumes`
    });

    expect(resumeResponse.statusCode).toBe(201);
    expect(resumeResponse.json().item.markdownContent).toContain("Frontend Engineer");
    expect(resumeResponse.json().warnings[0].code).toBe("AI_PROVIDER_FALLBACK");

    const greetingResponse = await failingProviderServer.inject({
      method: "POST",
      url: `/jobs/${created.id}/greetings`
    });

    expect(greetingResponse.statusCode).toBe(201);
    expect(greetingResponse.json().greeting.modelName).toBe("rule-based");
    expect(greetingResponse.json().warnings[0].code).toBe("AI_PROVIDER_FALLBACK");

    const reviewStrategyResponse = await failingProviderServer.inject({
      method: "POST",
      url: "/applications/review/strategy",
      payload: {
        activeApplications: 1,
        appliedOrBeyond: 0,
        generatedPackages: 1,
        interviewOrOffer: 0,
        overdueFollowUps: 0,
        replyCount: 0,
        staleActiveApplications: 1,
        totalJobs: 1,
        scopeLabel: "all jobs",
        strategySuggestions: [],
        attributionSignals: []
      }
    });

    expect(reviewStrategyResponse.statusCode).toBe(200);
    expect(reviewStrategyResponse.json().item.modelName).toBe("rule-based");
    expect(reviewStrategyResponse.json().warnings[0].code).toBe("AI_PROVIDER_FALLBACK");
  });
});
