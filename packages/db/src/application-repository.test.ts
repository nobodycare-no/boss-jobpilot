import { describe, expect, it } from "vitest";

import { createApplicationRepository } from "./application-repository";
import { openJobpilotDatabase } from "./experience-repository";
import { createJobRepository } from "./job-repository";

describe("application repository", () => {
  it("creates, lists and returns latest application draft for a job", () => {
    const db = openJobpilotDatabase(":memory:");
    const jobs = createJobRepository(db);
    const applications = createApplicationRepository(db);

    const job = jobs.create({
      platform: "boss",
      title: "AI Frontend Engineer",
      jdRaw: "React and TypeScript"
    });

    const first = applications.create({
      jobId: job.id,
      status: "draft",
      greetingMessage: "Hello, I am interested in this role.",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const second = applications.create({
      jobId: job.id,
      status: "draft",
      greetingMessage: "Hello, I have React and TypeScript project experience.",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z"
    });

    expect(first.id).toBeTruthy();
    expect(applications.listByJobId(job.id)).toHaveLength(2);
    expect(applications.getLatestByJobId(job.id)?.id).toBe(second.id);

    const greeted = applications.update(second.id, {
      status: "greeted"
    });

    expect(greeted?.status).toBe("greeted");
    expect(greeted?.appliedAt).toBeUndefined();

    const applied = applications.update(second.id, {
      status: "applied"
    });
    const events = applications.listEventsByApplicationId(second.id);

    expect(applied?.status).toBe("applied");
    expect(applied?.appliedAt).toBeTruthy();
    expect(events).toHaveLength(2);
    expect(events.at(-1)?.type).toBe("status_changed");

    db.close();
  });
});
