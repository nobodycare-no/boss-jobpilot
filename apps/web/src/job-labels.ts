import type { Application, JobAnalysis } from "@boss-jobpilot/shared";

export const recommendationLabels: Record<JobAnalysis["recommendation"], string> = {
  prioritize: "优先投递",
  apply: "可以投递",
  cautious: "谨慎投递",
  skip: "建议跳过"
};

export const recommendationOrder = ["prioritize", "apply", "cautious", "skip"] satisfies Array<
  JobAnalysis["recommendation"]
>;

export const applicationStatusLabels: Record<Application["status"], string> = {
  draft: "话术待发送",
  greeted: "已打招呼",
  applied: "已投递后",
  replied: "已回复",
  interview: "面试中",
  rejected: "已拒绝",
  offer: "Offer",
  closed: "已关闭"
};

export type JobBoardStage = "unstarted" | "resumeReady" | Application["status"];

export const boardStageLabels: Record<JobBoardStage, string> = {
  unstarted: "待生成简历",
  resumeReady: "简历已生成",
  ...applicationStatusLabels
};

export const boardStageOrder = [
  "unstarted",
  "resumeReady",
  "draft",
  "greeted",
  "applied"
] satisfies JobBoardStage[];
