import { afterAll, describe, expect, it } from "vitest";

import { openJobpilotDatabase } from "@boss-jobpilot/db";

import { buildServer } from "./index";

const db = openJobpilotDatabase(":memory:");
const server = buildServer({ database: db });

describe("job routes", () => {
  afterAll(async () => {
    await server.close();
    db.close();
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

    const applicationEventsResponse = await server.inject({
      method: "GET",
      url: `/applications/${greetingResponse.json().item.id}/events`
    });

    expect(applicationEventsResponse.statusCode).toBe(200);
    expect(applicationEventsResponse.json().items).toHaveLength(1);
    expect(applicationEventsResponse.json().items[0].type).toBe("status_changed");
  });
});
