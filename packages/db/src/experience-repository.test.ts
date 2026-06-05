import { describe, expect, it } from "vitest";

import { createExperienceRepository, openJobpilotDatabase } from "./experience-repository";

describe("experience repository", () => {
  it("creates, updates, lists and deletes experience items", () => {
    const db = openJobpilotDatabase(":memory:");
    const repository = createExperienceRepository(db);

    const created = repository.create({
      type: "project",
      title: "AI 求职代理",
      role: "全栈开发",
      techStack: ["React", "Node.js"],
      responsibilities: ["设计经历库"],
      evidenceLevel: "deep_interview_ready",
      ownershipLevel: "owned"
    });

    expect(created.id).toBeTruthy();
    expect(repository.list()).toHaveLength(1);

    const updated = repository.update(created.id, {
      title: "AI 求职代理 MVP",
      tags: ["AI", "resume"]
    });

    expect(updated?.title).toBe("AI 求职代理 MVP");
    expect(updated?.tags).toEqual(["AI", "resume"]);
    expect(repository.delete(created.id)).toBe(true);
    expect(repository.list()).toHaveLength(0);

    db.close();
  });
});
