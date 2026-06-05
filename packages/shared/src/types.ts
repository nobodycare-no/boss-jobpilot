import type { z } from "zod";

import type { ExperienceItemSchema, JobAnalysisSchema, JobPostingSchema } from "./schemas";

export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type JobPostingInput = z.input<typeof JobPostingSchema>;
export type JobPosting = z.infer<typeof JobPostingSchema>;
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

export type CandidatePreference = {
  targetRoles: string[];
  targetCities: string[];
  preferredKeywords: string[];
  blockedKeywords: string[];
};
