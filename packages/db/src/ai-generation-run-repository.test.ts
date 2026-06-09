import { describe, expect, it } from "vitest";

import { createAiGenerationRunRepository } from "./ai-generation-run-repository";
import { openJobpilotDatabase } from "./experience-repository";
import { createJobRepository } from "./job-repository";

describe("ai generation run repository", () => {
  it("creates and lists recent generation runs", () => {
    const db = openJobpilotDatabase(":memory:");
    const jobs = createJobRepository(db);
    const runs = createAiGenerationRunRepository(db);
    const job = jobs.create({
      platform: "boss",
      title: "AI Frontend Engineer",
      jdRaw: "React TypeScript AI"
    });

    const created = runs.create({
      durationMs: 123,
      errorMessage: "provider unavailable",
      feature: "job-analysis",
      modelName: "rule-based",
      promptVersion: "job-analyzer@0.1.0",
      providerName: "packyapi",
      relatedJobId: job.id,
      status: "provider_fallback"
    });

    expect(created.id).toBeTruthy();
    expect(runs.listRecent()).toEqual([
      expect.objectContaining({
        durationMs: 123,
        errorMessage: "provider unavailable",
        feature: "job-analysis",
        providerName: "packyapi",
        relatedJobId: job.id,
        status: "provider_fallback"
      })
    ]);

    db.close();
  });
});
