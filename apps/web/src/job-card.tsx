import { BarChart3, Copy, FileText, MessageSquareText, Trash2 } from "lucide-react";

import type {
  Application,
  ApplicationEvent,
  ExperienceItem,
  GreetingVariant,
  JobAnalysis,
  JobPosting,
  ResumeVariant,
  ResumeVersion
} from "@boss-jobpilot/shared";

import {
  AnalysisPanel,
  ApplicationPanel,
  ResumePanel,
  VersionComparePanel,
  buildApplicationPackage
} from "./job-card-panels";

export type JobCardProps = {
  analysis?: JobAnalysis;
  application?: Application;
  applicationEvents: ApplicationEvent[];
  applicationHistory: Application[];
  experienceById: Map<string, ExperienceItem>;
  job: JobPosting;
  onAnalyze: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerateGreeting: (id: string, variant: GreetingVariant) => Promise<void>;
  onGenerateResume: (id: string, variant: ResumeVariant) => Promise<void>;
  onCopyText: (label: string, value: string) => Promise<void>;
  onUpdateFollowUp: (applicationId: string, nextFollowUpAt: string | null) => Promise<void>;
  onUpdateApplicationStatus: (
    applicationId: string,
    status: Application["status"]
  ) => Promise<void>;
  resume?: ResumeVersion;
  resumeHistory: ResumeVersion[];
};

export function JobCard({
  analysis,
  application,
  applicationEvents,
  applicationHistory,
  experienceById,
  job,
  onAnalyze,
  onDelete,
  onGenerateGreeting,
  onGenerateResume,
  onCopyText,
  onUpdateFollowUp,
  onUpdateApplicationStatus,
  resume,
  resumeHistory
}: JobCardProps) {
  return (
    <article className="experience-card">
      <div className="experience-card__header">
        <div>
          <span className="type-pill">{job.platform}</span>
          <h3>{job.title}</h3>
        </div>
        <div className="card-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => void onAnalyze(job.id)}
            title="分析"
          >
            <BarChart3 size={17} />
          </button>
          <ResumeVariantActions jobId={job.id} onGenerateResume={onGenerateResume} />
          <GreetingVariantActions jobId={job.id} onGenerateGreeting={onGenerateGreeting} />
          <button
            type="button"
            className="icon-button"
            onClick={() =>
              void onCopyText(
                "投递包",
                buildApplicationPackage({
                  analysis,
                  application,
                  events: applicationEvents,
                  experienceById,
                  job,
                  resume
                })
              )
            }
            title="复制投递包"
          >
            <Copy size={17} />
          </button>
          <button
            type="button"
            className="icon-button danger"
            onClick={() => void onDelete(job.id)}
            title="删除"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <p className="experience-meta">
        {[job.companyName, job.city, job.salaryText, job.experienceRequirement]
          .filter(Boolean)
          .join(" / ")}
      </p>
      <p>{job.jdRaw}</p>
      {analysis ? <AnalysisPanel analysis={analysis} experienceById={experienceById} /> : null}
      {resume ? <ResumePanel resume={resume} onCopyText={onCopyText} /> : null}
      {application ? (
        <ApplicationPanel
          application={application}
          events={applicationEvents}
          onCopyText={onCopyText}
          onUpdateFollowUp={onUpdateFollowUp}
          onUpdateStatus={onUpdateApplicationStatus}
        />
      ) : null}
      <VersionComparePanel
        applications={applicationHistory}
        onCopyText={onCopyText}
        resumes={resumeHistory}
      />
    </article>
  );
}

function ResumeVariantActions({
  jobId,
  onGenerateResume
}: {
  jobId: string;
  onGenerateResume: (id: string, variant: ResumeVariant) => Promise<void>;
}) {
  const variants = [
    { label: "快", title: "生成快投版简历", variant: "quick" },
    { label: "正", title: "生成正式版简历", variant: "formal" },
    { label: "技", title: "生成技术版简历", variant: "technical" }
  ] satisfies Array<{
    label: string;
    title: string;
    variant: ResumeVariant;
  }>;

  return (
    <div className="resume-variant-actions" aria-label="生成简历版本">
      {variants.map((item) => (
        <button
          type="button"
          className="icon-button"
          key={item.variant}
          onClick={() => void onGenerateResume(jobId, item.variant)}
          title={item.title}
        >
          <FileText size={15} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function GreetingVariantActions({
  jobId,
  onGenerateGreeting
}: {
  jobId: string;
  onGenerateGreeting: (id: string, variant: GreetingVariant) => Promise<void>;
}) {
  const variants = [
    { label: "礼", title: "生成礼貌版打招呼语", variant: "polite" },
    { label: "证", title: "生成证据版打招呼语", variant: "evidence" },
    { label: "直", title: "生成主动版打招呼语", variant: "direct" }
  ] satisfies Array<{
    label: string;
    title: string;
    variant: GreetingVariant;
  }>;

  return (
    <div className="greeting-variant-actions" aria-label="生成打招呼语版本">
      {variants.map((item) => (
        <button
          type="button"
          className="icon-button"
          key={item.variant}
          onClick={() => void onGenerateGreeting(jobId, item.variant)}
          title={item.title}
        >
          <MessageSquareText size={15} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
