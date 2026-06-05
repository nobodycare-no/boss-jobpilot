import { describe, expect, it } from "vitest";

import { openJobpilotDatabase } from "./experience-repository";
import { createJobRepository } from "./job-repository";

describe("job repository", () => {
  it("creates, updates, lists and deletes job postings", () => {
    const db = openJobpilotDatabase(":memory:");
    const repository = createJobRepository(db);

    const created = repository.create({
      platform: "boss",
      title: "前端开发工程师",
      salaryText: "20-35K",
      city: "上海",
      jdRaw: "需要 React、TypeScript 和 Node.js 经验。",
      companyName: "示例科技"
    });

    expect(created.id).toBeTruthy();
    expect(repository.list()).toHaveLength(1);

    const updated = repository.update(created.id, {
      title: "AI 前端开发工程师"
    });

    expect(updated?.title).toBe("AI 前端开发工程师");
    expect(repository.delete(created.id)).toBe(true);
    expect(repository.list()).toHaveLength(0);

    db.close();
  });
});
