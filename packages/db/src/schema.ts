import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const experienceItems = sqliteTable("experience_items", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  organization: text("organization"),
  role: text("role"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  summary: text("summary"),
  techStackJson: text("tech_stack_json").notNull().default("[]"),
  responsibilitiesJson: text("responsibilities_json").notNull().default("[]"),
  achievementsJson: text("achievements_json").notNull().default("[]"),
  metricsJson: text("metrics_json").notNull().default("[]"),
  evidenceLevel: text("evidence_level").notNull(),
  ownershipLevel: text("ownership_level").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  size: text("size"),
  financingStage: text("financing_stage"),
  website: text("website"),
  riskSignalsJson: text("risk_signals_json").notNull().default("[]"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const jobPostings = sqliteTable("job_postings", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  url: text("url"),
  title: text("title").notNull(),
  salaryText: text("salary_text"),
  city: text("city"),
  experienceRequirement: text("experience_requirement"),
  educationRequirement: text("education_requirement"),
  jdRaw: text("jd_raw").notNull().default(""),
  jdStructuredJson: text("jd_structured_json"),
  companyId: text("company_id").references(() => companies.id),
  recruiterName: text("recruiter_name"),
  capturedAt: text("captured_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobPostings.id),
  resumeVersionId: text("resume_version_id").references(() => resumeVersions.id),
  greetingVariant: text("greeting_variant").notNull().default("evidence"),
  status: text("status").notNull(),
  greetingMessage: text("greeting_message"),
  generationStatus: text("generation_status").notNull().default("rule_based"),
  providerName: text("provider_name"),
  modelName: text("model_name"),
  promptVersion: text("prompt_version"),
  appliedAt: text("applied_at"),
  nextFollowUpAt: text("next_follow_up_at"),
  outcome: text("outcome"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const applicationEvents = sqliteTable("application_events", {
  id: text("id").primaryKey(),
  applicationId: text("application_id")
    .notNull()
    .references(() => applications.id),
  type: text("type").notNull(),
  content: text("content"),
  occurredAt: text("occurred_at").notNull()
});

export const resumeVersions = sqliteTable("resume_versions", {
  id: text("id").primaryKey(),
  jobId: text("job_id").references(() => jobPostings.id),
  variant: text("variant").notNull(),
  markdownContent: text("markdown_content").notNull(),
  selectedExperienceIdsJson: text("selected_experience_ids_json").notNull().default("[]"),
  changeSummary: text("change_summary"),
  generationStatus: text("generation_status").notNull().default("rule_based"),
  providerName: text("provider_name"),
  modelName: text("model_name"),
  promptVersion: text("prompt_version"),
  createdAt: text("created_at").notNull()
});

export const jobAnalyses = sqliteTable("job_analyses", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobPostings.id),
  matchScore: integer("match_score").notNull(),
  recommendation: text("recommendation").notNull(),
  matchedKeywordsJson: text("matched_keywords_json").notNull().default("[]"),
  requiredSkillsJson: text("required_skills_json").notNull().default("[]"),
  bonusSkillsJson: text("bonus_skills_json").notNull().default("[]"),
  matchedExperienceIdsJson: text("matched_experience_ids_json").notNull().default("[]"),
  riskFlagsJson: text("risk_flags_json").notNull().default("[]"),
  resumeStrategy: text("resume_strategy"),
  generationStatus: text("generation_status").notNull().default("rule_based"),
  providerName: text("provider_name"),
  modelName: text("model_name"),
  promptVersion: text("prompt_version"),
  createdAt: text("created_at").notNull()
});

export const aiGenerationRuns = sqliteTable("ai_generation_runs", {
  id: text("id").primaryKey(),
  feature: text("feature").notNull(),
  status: text("status").notNull(),
  providerName: text("provider_name"),
  modelName: text("model_name"),
  promptVersion: text("prompt_version"),
  durationMs: integer("duration_ms").notNull(),
  errorMessage: text("error_message"),
  relatedJobId: text("related_job_id").references(() => jobPostings.id),
  createdAt: text("created_at").notNull()
});
