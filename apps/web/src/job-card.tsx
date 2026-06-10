import { BarChart3, Copy, FileText, MessageSquareText, Trash2 } from "lucide-react";

import type {
  Application,
  ApplicationEvent,
  ExperienceItem,
  JobAnalysis,
  JobPosting,
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
  onGenerateGreeting: (id: string) => Promise<void>;
  onGenerateResume: (id: string) => Promise<void>;
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
          <button
            type="button"
            className="icon-button"
            onClick={() => void onGenerateResume(job.id)}
            title="生成定制简历"
          >
            <FileText size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => void onGenerateGreeting(job.id)}
            title="生成打招呼语"
          >
            <MessageSquareText size={17} />
          </button>
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
