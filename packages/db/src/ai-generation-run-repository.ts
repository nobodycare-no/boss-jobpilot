import type { DatabaseSync } from "node:sqlite";

import {
  AiGenerationRunCreateSchema,
  AiGenerationRunSchema,
  type AiGenerationRun,
  type AiGenerationRunCreateInput
} from "@boss-jobpilot/shared";

type AiGenerationRunRow = {
  id: string;
  feature: string;
  status: string;
  provider_name: string | null;
  model_name: string | null;
  prompt_version: string | null;
  duration_ms: number;
  error_message: string | null;
  related_job_id: string | null;
  created_at: string;
};

export type AiGenerationRunRepository = ReturnType<typeof createAiGenerationRunRepository>;

export function createAiGenerationRunRepository(db: DatabaseSync) {
  return {
    create(input: AiGenerationRunCreateInput) {
      const now = new Date().toISOString();
      const run = AiGenerationRunSchema.parse({
        ...AiGenerationRunCreateSchema.parse(input),
        id: input.id ?? crypto.randomUUID(),
        createdAt: input.createdAt ?? now
      });

      db.prepare(
        `
        INSERT INTO ai_generation_runs (
          id,
          feature,
          status,
          provider_name,
          model_name,
          prompt_version,
          duration_ms,
          error_message,
          related_job_id,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        run.id,
        run.feature,
        run.status,
        run.providerName ?? null,
        run.modelName ?? null,
        run.promptVersion ?? null,
        run.durationMs,
        run.errorMessage ?? null,
        run.relatedJobId ?? null,
        run.createdAt
      );

      return run;
    },

    listRecent(limit = 20) {
      const normalizedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
      const rows = db
        .prepare(
          `
          SELECT *
          FROM ai_generation_runs
          ORDER BY created_at DESC
          LIMIT ?
        `
        )
        .all(normalizedLimit) as AiGenerationRunRow[];

      return rows.map(rowToAiGenerationRun);
    }
  };
}

function rowToAiGenerationRun(row: AiGenerationRunRow): AiGenerationRun {
  return AiGenerationRunSchema.parse({
    id: row.id,
    feature: row.feature,
    status: row.status,
    providerName: row.provider_name ?? undefined,
    modelName: row.model_name ?? undefined,
    promptVersion: row.prompt_version ?? undefined,
    durationMs: row.duration_ms,
    errorMessage: row.error_message ?? undefined,
    relatedJobId: row.related_job_id ?? undefined,
    createdAt: row.created_at
  });
}
