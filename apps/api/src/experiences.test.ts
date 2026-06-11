import { afterAll, describe, expect, it } from "vitest";

import { openJobpilotDatabase } from "@boss-jobpilot/db";

import { buildServer } from "./index";

const db = openJobpilotDatabase(":memory:");
const server = buildServer({ database: db });

describe("experience routes", () => {
  afterAll(async () => {
    await server.close();
    db.close();
  });

  it("creates and lists experiences", async () => {
    const createResponse = await server.inject({
      method: "POST",
      url: "/experiences",
      payload: {
        type: "project",
        title: "AI 求职代理",
        techStack: ["React", "Node.js"],
        responsibilities: ["实现经历库 CRUD"],
        evidenceLevel: "deep_interview_ready",
        ownershipLevel: "owned"
      }
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await server.inject({
      method: "GET",
      url: "/experiences"
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);
  });

  it("creates resume materials", async () => {
    const createResponse = await server.inject({
      method: "POST",
      url: "/experiences",
      payload: {
        type: "resume",
        title: "Frontend resume",
        role: "Frontend Engineer",
        summary: "React, TypeScript, Node.js and AI application experience.",
        responsibilities: ["React, TypeScript, Node.js and AI application experience."],
        techStack: ["React", "TypeScript", "Node.js"],
        evidenceLevel: "deep_interview_ready",
        ownershipLevel: "owned",
        tags: ["resume"]
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().item).toMatchObject({
      type: "resume",
      title: "Frontend resume"
    });
  });
});
