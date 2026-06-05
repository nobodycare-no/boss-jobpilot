import type { z } from "zod";

import type {
  ExperienceItemCreateSchema,
  ExperienceItemSchema,
  ExperienceItemUpdateSchema,
  JobAnalysisCreateSchema,
  JobAnalysisSchema,
  JobPostingCreateSchema,
  JobPostingSchema,
  JobPostingUpdateSchema
} from "./schemas";

export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type ExperienceItemCreateInput = z.input<typeof ExperienceItemCreateSchema>;
export type ExperienceItemUpdateInput = z.input<typeof ExperienceItemUpdateSchema>;
export type JobPostingInput = z.input<typeof JobPostingSchema>;
export type JobPosting = z.infer<typeof JobPostingSchema>;
export type JobPostingCreateInput = z.input<typeof JobPostingCreateSchema>;
export type JobPostingUpdateInput = z.input<typeof JobPostingUpdateSchema>;
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
export type JobAnalysisCreateInput = z.input<typeof JobAnalysisCreateSchema>;

export type CandidatePreference = {
  targetRoles: string[];
  targetCities: string[];
  preferredKeywords: string[];
  blockedKeywords: string[];
};
