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
    expect(first.greetingVariant).toBe("evidence");
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

    const followUp = applications.update(second.id, {
      nextFollowUpAt: "2026-01-03T02:00:00.000Z"
    });

    expect(followUp?.nextFollowUpAt).toBe("2026-01-03T02:00:00.000Z");
    expect(applications.listEventsByApplicationId(second.id)).toHaveLength(2);

    const clearedFollowUp = applications.update(second.id, {
      nextFollowUpAt: null
    });

    expect(clearedFollowUp?.nextFollowUpAt).toBeUndefined();

    db.close();
  });

  it("stores greeting variants for application drafts", () => {
    const db = openJobpilotDatabase(":memory:");
    const jobs = createJobRepository(db);
    const applications = createApplicationRepository(db);

    const job = jobs.create({
      platform: "boss",
      title: "AI Frontend Engineer",
      jdRaw: "React and TypeScript"
    });
    const application = applications.create({
      jobId: job.id,
      greetingVariant: "direct",
      status: "draft",
      greetingMessage: "Hello, can we chat about this role?"
    });

    expect(application.greetingVariant).toBe("direct");
    expect(applications.get(application.id)?.greetingVariant).toBe("direct");

    const updated = applications.update(application.id, {
      greetingVariant: "polite"
    });

    expect(updated?.greetingVariant).toBe("polite");

    db.close();
  });
});
