import type { DatabaseSync } from "node:sqlite";

import {
  JobAnalysisCreateSchema,
  JobAnalysisSchema,
  type JobAnalysis,
  type JobAnalysisCreateInput
} from "@boss-jobpilot/shared";

type JobAnalysisRow = {
  id: string;
  job_id: string;
  match_score: number;
  recommendation: string;
  matched_keywords_json: string;
  required_skills_json: string;
  bonus_skills_json: string;
  matched_experience_ids_json: string;
  risk_flags_json: string;
  resume_strategy: string | null;
  model_name: string | null;
  prompt_version: string | null;
  created_at: string;
};

export type JobAnalysisRepository = ReturnType<typeof createJobAnalysisRepository>;

export function createJobAnalysisRepository(db: DatabaseSync) {
  return {
    listByJobId(jobId: string) {
      const rows = db
        .prepare(
          `
          SELECT *
          FROM job_analyses
          WHERE job_id = ?
          ORDER BY created_at DESC
        `
        )
        .all(jobId) as JobAnalysisRow[];

      return rows.map(rowToJobAnalysis);
    },

    getLatestByJobId(jobId: string) {
      const row = db
        .prepare(
          `
          SELECT *
          FROM job_analyses
          WHERE job_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `
        )
        .get(jobId) as JobAnalysisRow | undefined;

      return row ? rowToJobAnalysis(row) : undefined;
    },

    create(input: JobAnalysisCreateInput) {
      const now = new Date().toISOString();
      const analysis = JobAnalysisSchema.parse({
        ...JobAnalysisCreateSchema.parse(input),
        id: input.id ?? crypto.randomUUID(),
        createdAt: input.createdAt ?? now
      });

      db.prepare(
        `
        INSERT INTO job_analyses (
          id,
          job_id,
          match_score,
          recommendation,
          matched_keywords_json,
          required_skills_json,
          bonus_skills_json,
          matched_experience_ids_json,
          risk_flags_json,
          resume_strategy,
          model_name,
          prompt_version,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        analysis.id,
        analysis.jobId,
        analysis.matchScore,
        analysis.recommendation,
        JSON.stringify(analysis.matchedKeywords),
        JSON.stringify(analysis.requiredSkills),
        JSON.stringify(analysis.bonusSkills),
        JSON.stringify(analysis.matchedExperienceIds),
        JSON.stringify(analysis.riskFlags),
        analysis.resumeStrategy,
        analysis.modelName,
        analysis.promptVersion,
        analysis.createdAt
      );

      return analysis;
    }
  };
}

function rowToJobAnalysis(row: JobAnalysisRow): JobAnalysis {
  return JobAnalysisSchema.parse({
    id: row.id,
    jobId: row.job_id,
    matchScore: row.match_score,
    recommendation: row.recommendation,
    matchedKeywords: parseJsonArray(row.matched_keywords_json),
    requiredSkills: parseJsonArray(row.required_skills_json),
    bonusSkills: parseJsonArray(row.bonus_skills_json),
    matchedExperienceIds: parseJsonArray(row.matched_experience_ids_json),
    riskFlags: parseJsonArray(row.risk_flags_json),
    resumeStrategy: row.resume_strategy ?? "",
    modelName: row.model_name ?? "rule-based",
    promptVersion: row.prompt_version ?? "rule-based-job-analysis@0.1.0",
    createdAt: row.created_at
  });
}

function parseJsonArray(value: string) {
  const parsed: unknown = JSON.parse(value);

  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}
