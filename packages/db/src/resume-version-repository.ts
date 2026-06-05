import type { DatabaseSync } from "node:sqlite";

import {
  ResumeVersionCreateSchema,
  ResumeVersionSchema,
  type ResumeVersion,
  type ResumeVersionCreateInput
} from "@boss-jobpilot/shared";

type ResumeVersionRow = {
  id: string;
  job_id: string;
  variant: string;
  markdown_content: string;
  selected_experience_ids_json: string;
  change_summary: string | null;
  created_at: string;
};

export type ResumeVersionRepository = ReturnType<typeof createResumeVersionRepository>;

export function createResumeVersionRepository(db: DatabaseSync) {
  return {
    listByJobId(jobId: string) {
      const rows = db
        .prepare(
          `
          SELECT *
          FROM resume_versions
          WHERE job_id = ?
          ORDER BY created_at DESC
        `
        )
        .all(jobId) as ResumeVersionRow[];

      return rows.map(rowToResumeVersion);
    },

    getLatestByJobId(jobId: string) {
      const row = db
        .prepare(
          `
          SELECT *
          FROM resume_versions
          WHERE job_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `
        )
        .get(jobId) as ResumeVersionRow | undefined;

      return row ? rowToResumeVersion(row) : undefined;
    },

    create(input: ResumeVersionCreateInput) {
      const now = new Date().toISOString();
      const version = ResumeVersionSchema.parse({
        ...ResumeVersionCreateSchema.parse(input),
        id: input.id ?? crypto.randomUUID(),
        createdAt: input.createdAt ?? now
      });

      db.prepare(
        `
        INSERT INTO resume_versions (
          id,
          job_id,
          variant,
          markdown_content,
          selected_experience_ids_json,
          change_summary,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        version.id,
        version.jobId,
        version.variant,
        version.markdownContent,
        JSON.stringify(version.selectedExperienceIds),
        version.changeSummary,
        version.createdAt
      );

      return version;
    }
  };
}

function rowToResumeVersion(row: ResumeVersionRow): ResumeVersion {
  return ResumeVersionSchema.parse({
    id: row.id,
    jobId: row.job_id,
    variant: row.variant,
    markdownContent: row.markdown_content,
    selectedExperienceIds: parseJsonArray(row.selected_experience_ids_json),
    changeSummary: row.change_summary ?? "",
    createdAt: row.created_at
  });
}

function parseJsonArray(value: string) {
  const parsed: unknown = JSON.parse(value);

  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}
