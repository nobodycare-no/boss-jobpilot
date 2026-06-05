import { z } from "zod";

export const ExperienceTypeSchema = z.enum([
  "project",
  "internship",
  "work",
  "open_source",
  "education"
]);

export const EvidenceLevelSchema = z.enum([
  "deep_interview_ready",
  "can_explain_briefly",
  "familiar_only",
  "do_not_use"
]);

export const OwnershipLevelSchema = z.enum(["led", "owned", "participated", "assisted"]);

export const ExperienceItemSchema = z.object({
  id: z.string().min(1),
  type: ExperienceTypeSchema,
  title: z.string().min(1),
  organization: z.string().optional(),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  techStack: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  evidenceLevel: EvidenceLevelSchema.default("can_explain_briefly"),
  ownershipLevel: OwnershipLevelSchema.default("participated"),
  tags: z.array(z.string()).default([])
});

export const ExperienceItemCreateSchema = ExperienceItemSchema.omit({
  id: true
}).extend({
  id: z.string().min(1).optional()
});

export const ExperienceItemUpdateSchema = ExperienceItemCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const JobPostingSchema = z.object({
  id: z.string().min(1),
  platform: z.string().min(1),
  url: z.string().url().optional(),
  title: z.string().min(1),
  salaryText: z.string().optional(),
  city: z.string().optional(),
  experienceRequirement: z.string().optional(),
  educationRequirement: z.string().optional(),
  jdRaw: z.string().default(""),
  companyName: z.string().optional(),
  capturedAt: z.string().datetime()
});

export const JobPostingCreateSchema = JobPostingSchema.omit({
  id: true,
  capturedAt: true
}).extend({
  id: z.string().min(1).optional(),
  capturedAt: z.string().datetime().optional()
});

export const JobPostingUpdateSchema = JobPostingCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const JobAnalysisSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  matchScore: z.number().min(0).max(100),
  recommendation: z.enum(["prioritize", "apply", "cautious", "skip"]),
  matchedKeywords: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  bonusSkills: z.array(z.string()).default([]),
  matchedExperienceIds: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  resumeStrategy: z.string().default(""),
  modelName: z.string().default("rule-based"),
  promptVersion: z.string().default("rule-based-job-analysis@0.1.0"),
  createdAt: z.string().datetime()
});

export const JobAnalysisCreateSchema = JobAnalysisSchema.omit({
  id: true,
  createdAt: true
}).extend({
  id: z.string().min(1).optional(),
  createdAt: z.string().datetime().optional()
});
