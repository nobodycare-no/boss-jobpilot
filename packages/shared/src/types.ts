import type { z } from "zod";

import type {
  ExperienceItemCreateSchema,
  ExperienceItemSchema,
  ExperienceItemUpdateSchema,
  JobAnalysisSchema,
  JobPostingSchema
} from "./schemas";

export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type ExperienceItemCreateInput = z.input<typeof ExperienceItemCreateSchema>;
export type ExperienceItemUpdateInput = z.input<typeof ExperienceItemUpdateSchema>;
export type JobPostingInput = z.input<typeof JobPostingSchema>;
export type JobPosting = z.infer<typeof JobPostingSchema>;
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

export type CandidatePreference = {
  targetRoles: string[];
  targetCities: string[];
  preferredKeywords: string[];
  blockedKeywords: string[];
};
