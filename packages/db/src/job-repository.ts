import type { DatabaseSync } from "node:sqlite";

import {
  JobPostingCreateSchema,
  JobPostingSchema,
  JobPostingUpdateSchema,
  type JobPosting,
  type JobPostingCreateInput,
  type JobPostingUpdateInput
} from "@boss-jobpilot/shared";

type JobRow = {
  id: string;
  platform: string;
  url: string | null;
  title: string;
  salary_text: string | null;
  city: string | null;
  experience_requirement: string | null;
  education_requirement: string | null;
  jd_raw: string;
  company_name: string | null;
  captured_at: string;
};

export type JobRepository = ReturnType<typeof createJobRepository>;

export function createJobRepository(db: DatabaseSync) {
  return {
    list() {
      const rows = db
        .prepare(
          `
          SELECT *
          FROM job_postings
          ORDER BY captured_at DESC, updated_at DESC
        `
        )
        .all() as JobRow[];

      return rows.map(rowToJobPosting);
    },

    get(id: string) {
      const row = db
        .prepare(
          `
          SELECT *
          FROM job_postings
          WHERE id = ?
        `
        )
        .get(id) as JobRow | undefined;

      return row ? rowToJobPosting(row) : undefined;
    },

    create(input: JobPostingCreateInput) {
      const now = new Date().toISOString();
      const job = JobPostingSchema.parse({
        ...JobPostingCreateSchema.parse(input),
        id: input.id ?? crypto.randomUUID(),
        capturedAt: input.capturedAt ?? now
      });

      db.prepare(
        `
        INSERT INTO job_postings (
          id,
          platform,
          url,
          title,
          salary_text,
          city,
          experience_requirement,
          education_requirement,
          jd_raw,
          company_name,
          captured_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        job.id,
        job.platform,
        job.url ?? null,
        job.title,
        job.salaryText ?? null,
        job.city ?? null,
        job.experienceRequirement ?? null,
        job.educationRequirement ?? null,
        job.jdRaw,
        job.companyName ?? null,
        job.capturedAt,
        now,
        now
      );

      return job;
    },

    update(id: string, input: JobPostingUpdateInput) {
      const existing = this.get(id);

      if (!existing) {
        return undefined;
      }

      const next = JobPostingSchema.parse({
        ...existing,
        ...JobPostingUpdateSchema.parse(input),
        id
      });
      const now = new Date().toISOString();

      db.prepare(
        `
        UPDATE job_postings
        SET
          platform = ?,
          url = ?,
          title = ?,
          salary_text = ?,
          city = ?,
          experience_requirement = ?,
          education_requirement = ?,
          jd_raw = ?,
          company_name = ?,
          captured_at = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        next.platform,
        next.url ?? null,
        next.title,
        next.salaryText ?? null,
        next.city ?? null,
        next.experienceRequirement ?? null,
        next.educationRequirement ?? null,
        next.jdRaw,
        next.companyName ?? null,
        next.capturedAt,
        now,
        id
      );

      return next;
    },

    delete(id: string) {
      const result = db
        .prepare(
          `
          DELETE FROM job_postings
          WHERE id = ?
        `
        )
        .run(id);

      return result.changes > 0;
    }
  };
}

function rowToJobPosting(row: JobRow): JobPosting {
  return JobPostingSchema.parse({
    id: row.id,
    platform: row.platform,
    url: row.url ?? undefined,
    title: row.title,
    salaryText: row.salary_text ?? undefined,
    city: row.city ?? undefined,
    experienceRequirement: row.experience_requirement ?? undefined,
    educationRequirement: row.education_requirement ?? undefined,
    jdRaw: row.jd_raw,
    companyName: row.company_name ?? undefined,
    capturedAt: row.captured_at
  });
}
