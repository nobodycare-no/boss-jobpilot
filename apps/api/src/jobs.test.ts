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
  });
});
