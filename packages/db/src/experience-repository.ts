import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  ExperienceItemCreateSchema,
  ExperienceItemSchema,
  ExperienceItemUpdateSchema,
  type ExperienceItem,
  type ExperienceItemCreateInput,
  type ExperienceItemUpdateInput
} from "@boss-jobpilot/shared";

type ExperienceRow = {
  id: string;
  type: string;
  title: string;
  organization: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  summary: string | null;
  tech_stack_json: string;
  responsibilities_json: string;
  achievements_json: string;
  metrics_json: string;
  evidence_level: string;
  ownership_level: string;
  tags_json: string;
};

export type ExperienceRepository = ReturnType<typeof createExperienceRepository>;

export function openJobpilotDatabase(path = "data/jobpilot.sqlite") {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS experience_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      organization TEXT,
      role TEXT,
      start_date TEXT,
      end_date TEXT,
      summary TEXT,
      tech_stack_json TEXT NOT NULL DEFAULT '[]',
      responsibilities_json TEXT NOT NULL DEFAULT '[]',
      achievements_json TEXT NOT NULL DEFAULT '[]',
      metrics_json TEXT NOT NULL DEFAULT '[]',
      evidence_level TEXT NOT NULL,
      ownership_level TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_postings (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      url TEXT,
      title TEXT NOT NULL,
      salary_text TEXT,
      city TEXT,
      experience_requirement TEXT,
      education_requirement TEXT,
      jd_raw TEXT NOT NULL DEFAULT '',
      company_name TEXT,
      captured_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_analyses (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      match_score INTEGER NOT NULL,
      recommendation TEXT NOT NULL,
      matched_keywords_json TEXT NOT NULL DEFAULT '[]',
      required_skills_json TEXT NOT NULL DEFAULT '[]',
      bonus_skills_json TEXT NOT NULL DEFAULT '[]',
      matched_experience_ids_json TEXT NOT NULL DEFAULT '[]',
      risk_flags_json TEXT NOT NULL DEFAULT '[]',
      resume_strategy TEXT,
      model_name TEXT,
      prompt_version TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES job_postings(id)
    );

    CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      variant TEXT NOT NULL,
      markdown_content TEXT NOT NULL,
      selected_experience_ids_json TEXT NOT NULL DEFAULT '[]',
      change_summary TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES job_postings(id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      resume_version_id TEXT,
      status TEXT NOT NULL,
      greeting_message TEXT,
      applied_at TEXT,
      next_follow_up_at TEXT,
      outcome TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES job_postings(id),
      FOREIGN KEY (resume_version_id) REFERENCES resume_versions(id)
    );

    CREATE TABLE IF NOT EXISTS application_events (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      occurred_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );
  `);

  return db;
}

export function createExperienceRepository(db: DatabaseSync) {
  return {
    list() {
      const rows = db
        .prepare(
          `
          SELECT *
          FROM experience_items
          ORDER BY updated_at DESC, created_at DESC
        `
        )
        .all() as ExperienceRow[];

      return rows.map(rowToExperience);
    },

    get(id: string) {
      const row = db
        .prepare(
          `
          SELECT *
          FROM experience_items
          WHERE id = ?
        `
        )
        .get(id) as ExperienceRow | undefined;

      return row ? rowToExperience(row) : undefined;
    },

    create(input: ExperienceItemCreateInput) {
      const now = new Date().toISOString();
      const item = ExperienceItemSchema.parse({
        ...ExperienceItemCreateSchema.parse(input),
        id: input.id ?? crypto.randomUUID()
      });

      db.prepare(
        `
        INSERT INTO experience_items (
          id,
          type,
          title,
          organization,
          role,
          start_date,
          end_date,
          summary,
          tech_stack_json,
          responsibilities_json,
          achievements_json,
          metrics_json,
          evidence_level,
          ownership_level,
          tags_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        item.id,
        item.type,
        item.title,
        item.organization ?? null,
        item.role ?? null,
        item.startDate ?? null,
        item.endDate ?? null,
        item.summary ?? null,
        JSON.stringify(item.techStack),
        JSON.stringify(item.responsibilities),
        JSON.stringify(item.achievements),
        JSON.stringify(item.metrics),
        item.evidenceLevel,
        item.ownershipLevel,
        JSON.stringify(item.tags),
        now,
        now
      );

      return item;
    },

    update(id: string, input: ExperienceItemUpdateInput) {
      const existing = this.get(id);

      if (!existing) {
        return undefined;
      }

      const next = ExperienceItemSchema.parse({
        ...existing,
        ...ExperienceItemUpdateSchema.parse(input),
        id
      });
      const now = new Date().toISOString();

      db.prepare(
        `
        UPDATE experience_items
        SET
          type = ?,
          title = ?,
          organization = ?,
          role = ?,
          start_date = ?,
          end_date = ?,
          summary = ?,
          tech_stack_json = ?,
          responsibilities_json = ?,
          achievements_json = ?,
          metrics_json = ?,
          evidence_level = ?,
          ownership_level = ?,
          tags_json = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        next.type,
        next.title,
        next.organization ?? null,
        next.role ?? null,
        next.startDate ?? null,
        next.endDate ?? null,
        next.summary ?? null,
        JSON.stringify(next.techStack),
        JSON.stringify(next.responsibilities),
        JSON.stringify(next.achievements),
        JSON.stringify(next.metrics),
        next.evidenceLevel,
        next.ownershipLevel,
        JSON.stringify(next.tags),
        now,
        id
      );

      return next;
    },

    delete(id: string) {
      const result = db
        .prepare(
          `
          DELETE FROM experience_items
          WHERE id = ?
        `
        )
        .run(id);

      return result.changes > 0;
    }
  };
}

function rowToExperience(row: ExperienceRow): ExperienceItem {
  return ExperienceItemSchema.parse({
    id: row.id,
    type: row.type,
    title: row.title,
    organization: row.organization ?? undefined,
    role: row.role ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    summary: row.summary ?? undefined,
    techStack: parseJsonArray(row.tech_stack_json),
    responsibilities: parseJsonArray(row.responsibilities_json),
    achievements: parseJsonArray(row.achievements_json),
    metrics: parseJsonArray(row.metrics_json),
    evidenceLevel: row.evidence_level,
    ownershipLevel: row.ownership_level,
    tags: parseJsonArray(row.tags_json)
  });
}

function parseJsonArray(value: string) {
  const parsed: unknown = JSON.parse(value);

  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}
