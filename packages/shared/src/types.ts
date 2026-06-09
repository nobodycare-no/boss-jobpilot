import type { z } from "zod";

import type {
  ApplicationCreateSchema,
  ApplicationEventSchema,
  ApplicationReviewStrategyRecapSchema,
  ApplicationReviewStrategyRequestSchema,
  ApplicationSchema,
  ApplicationUpdateSchema,
  ExperienceItemCreateSchema,
  ExperienceItemSchema,
  ExperienceItemUpdateSchema,
  JobAnalysisCreateSchema,
  JobAnalysisSchema,
  JobPostingCreateSchema,
  JobPostingSchema,
  JobPostingUpdateSchema,
  ResumeVersionCreateSchema,
  ResumeVersionSchema
} from "./schemas";

export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationEvent = z.infer<typeof ApplicationEventSchema>;
export type ApplicationCreateInput = z.input<typeof ApplicationCreateSchema>;
export type ApplicationUpdateInput = z.input<typeof ApplicationUpdateSchema>;
export type ApplicationReviewStrategyRequest = z.infer<
  typeof ApplicationReviewStrategyRequestSchema
>;
export type ApplicationReviewStrategyRecap = z.infer<typeof ApplicationReviewStrategyRecapSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type ExperienceItemCreateInput = z.input<typeof ExperienceItemCreateSchema>;
export type ExperienceItemUpdateInput = z.input<typeof ExperienceItemUpdateSchema>;
export type JobPostingInput = z.input<typeof JobPostingSchema>;
export type JobPosting = z.infer<typeof JobPostingSchema>;
export type JobPostingCreateInput = z.input<typeof JobPostingCreateSchema>;
export type JobPostingUpdateInput = z.input<typeof JobPostingUpdateSchema>;
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
export type JobAnalysisCreateInput = z.input<typeof JobAnalysisCreateSchema>;
export type ResumeVersion = z.infer<typeof ResumeVersionSchema>;
export type ResumeVersionCreateInput = z.input<typeof ResumeVersionCreateSchema>;

export type CandidatePreference = {
  targetRoles: string[];
  targetCities: string[];
  preferredKeywords: string[];
  blockedKeywords: string[];
};
