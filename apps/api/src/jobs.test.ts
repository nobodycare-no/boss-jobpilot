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

  it("creates, lists and analyzes jobs", async () => {
    const createResponse = await server.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        platform: "boss",
        title: "AI 前端开发工程师",
        salaryText: "20-35K",
        city: "上海",
        jdRaw: "负责 React、TypeScript、Node.js 和 AI API 接入。",
        companyName: "示例科技"
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
    expect(analysisResponse.json().score.recommendation).toBe("prioritize");
  });
});
