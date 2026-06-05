import type { DatabaseSync } from "node:sqlite";

import {
  ApplicationCreateSchema,
  ApplicationSchema,
  type Application,
  type ApplicationCreateInput
} from "@boss-jobpilot/shared";

type ApplicationRow = {
  id: string;
  job_id: string;
  resume_version_id: string | null;
  status: string;
  greeting_message: string | null;
  applied_at: string | null;
  next_follow_up_at: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationRepository = ReturnType<typeof createApplicationRepository>;

export function createApplicationRepository(db: DatabaseSync) {
  return {
    listByJobId(jobId: string) {
      const rows = db
        .prepare(
          `
          SELECT *
          FROM applications
          WHERE job_id = ?
          ORDER BY updated_at DESC, created_at DESC
        `
        )
        .all(jobId) as ApplicationRow[];

      return rows.map(rowToApplication);
    },

    getLatestByJobId(jobId: string) {
      const row = db
        .prepare(
          `
          SELECT *
          FROM applications
          WHERE job_id = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT 1
        `
        )
        .get(jobId) as ApplicationRow | undefined;

      return row ? rowToApplication(row) : undefined;
    },

    create(input: ApplicationCreateInput) {
      const now = new Date().toISOString();
      const item = ApplicationSchema.parse({
        ...ApplicationCreateSchema.parse(input),
        id: input.id ?? crypto.randomUUID(),
        createdAt: input.createdAt ?? now,
        updatedAt: input.updatedAt ?? now
      });

      db.prepare(
        `
        INSERT INTO applications (
          id,
          job_id,
          resume_version_id,
          status,
          greeting_message,
          applied_at,
          next_follow_up_at,
          outcome,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        item.id,
        item.jobId,
        item.resumeVersionId ?? null,
        item.status,
        item.greetingMessage,
        item.appliedAt ?? null,
        item.nextFollowUpAt ?? null,
        item.outcome ?? null,
        item.createdAt,
        item.updatedAt
      );

      return item;
    }
  };
}

function rowToApplication(row: ApplicationRow): Application {
  return ApplicationSchema.parse({
    id: row.id,
    jobId: row.job_id,
    resumeVersionId: row.resume_version_id ?? undefined,
    status: row.status,
    greetingMessage: row.greeting_message ?? "",
    appliedAt: row.applied_at ?? undefined,
    nextFollowUpAt: row.next_follow_up_at ?? undefined,
    outcome: row.outcome ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}
