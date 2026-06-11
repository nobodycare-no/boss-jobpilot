import {
  BarChart3,
  Copy,
  FileClock,
  FileText,
  MessageSquareText,
  RefreshCw,
  Trash2
} from "lucide-react";

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
  activeTool: JobCardTool;
  analysis?: JobAnalysis;
  application?: Application;
  applicationEvents: ApplicationEvent[];
  applicationHistory: Application[];
  busyLabel?: string;
  experienceById: Map<string, ExperienceItem>;
  job: JobPosting;
  onAnalyze: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerateGreeting: (id: string, variant: GreetingVariant) => Promise<void>;
  onGenerateResume: (id: string, variant: ResumeVariant) => Promise<void>;
  onCopyText: (label: string, value: string) => Promise<void>;
  onSaveGreetingEdit: (applicationId: string, greetingMessage: string) => Promise<void>;
  onSaveResumeEdit: (resume: ResumeVersion, markdownContent: string) => Promise<void>;
  onUpdateFollowUp: (applicationId: string, nextFollowUpAt: string | null) => Promise<void>;
  onUpdateApplicationStatus: (
    applicationId: string,
    status: Application["status"]
  ) => Promise<void>;
  onToolChange: (tool: JobCardTool) => void;
  resume?: ResumeVersion;
  resumeHistory: ResumeVersion[];
};

export type JobCardTool = "analysis" | "resume" | "greeting" | "versions";

export function JobCard({
  activeTool,
  analysis,
  application,
  applicationEvents,
  applicationHistory,
  busyLabel,
  experienceById,
  job,
  onAnalyze,
  onDelete,
  onGenerateGreeting,
  onGenerateResume,
  onCopyText,
  onSaveGreetingEdit,
  onSaveResumeEdit,
  onUpdateFollowUp,
  onUpdateApplicationStatus,
  onToolChange,
  resume,
  resumeHistory
}: JobCardProps) {
  const isBusy = Boolean(busyLabel);

  return (
    <article className="job-detail-card">
      <div className="job-detail-card__header">
        <div>
          <span className="type-pill">{job.platform}</span>
          <h3>{job.title}</h3>
          <p className="experience-meta">
            {[job.companyName, job.city, job.salaryText, job.experienceRequirement]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>
        <div className="card-actions">
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

      <div className="job-tool-tabs" aria-label="当前岗位工具栏">
        <ToolTab
          activeTool={activeTool}
          Icon={BarChart3}
          label={analysis ? `${analysis.matchScore} 分` : "分析"}
          tool="analysis"
          onToolChange={onToolChange}
        />
        <ToolTab
          activeTool={activeTool}
          Icon={FileText}
          label={resume ? "简历" : "生成简历"}
          tool="resume"
          onToolChange={onToolChange}
        />
        <ToolTab
          activeTool={activeTool}
          Icon={MessageSquareText}
          label={application ? "话术" : "打招呼"}
          tool="greeting"
          onToolChange={onToolChange}
        />
        <ToolTab
          activeTool={activeTool}
          Icon={FileClock}
          label="版本"
          tool="versions"
          onToolChange={onToolChange}
        />
      </div>

      {busyLabel ? (
        <div className="job-card-busy" role="status">
          <RefreshCw size={15} />
          {busyLabel}
        </div>
      ) : null}

      <section className="job-summary-panel" aria-label="岗位核心信息">
        <div>
          <strong>JD 摘要</strong>
          <p>{job.jdRaw || "暂无岗位描述"}</p>
        </div>
      </section>

      <div className="job-tool-panel">
        {activeTool === "analysis" ? (
          <>
            <div className="job-tool-actions">
              <button
                type="button"
                className="panel-action-button"
                disabled={isBusy}
                onClick={() => void onAnalyze(job.id)}
              >
                <BarChart3 size={15} />
                {analysis ? "重新分析" : "分析当前岗位"}
              </button>
            </div>
            {analysis ? (
              <AnalysisPanel analysis={analysis} experienceById={experienceById} />
            ) : (
              <p className="empty-state">还没有分析结果。</p>
            )}
          </>
        ) : null}

        {activeTool === "resume" ? (
          <>
            <ResumeVariantActions
              disabled={isBusy || !analysis}
              jobId={job.id}
              onGenerateResume={onGenerateResume}
            />
            {!analysis ? <p className="empty-state">先完成岗位分析，再生成定制简历。</p> : null}
            {resume ? (
              <ResumePanel resume={resume} onCopyText={onCopyText} onSaveEdit={onSaveResumeEdit} />
            ) : null}
          </>
        ) : null}

        {activeTool === "greeting" ? (
          <>
            <GreetingVariantActions
              disabled={isBusy || !analysis}
              jobId={job.id}
              onGenerateGreeting={onGenerateGreeting}
            />
            {!analysis ? <p className="empty-state">先完成岗位分析，再生成打招呼语。</p> : null}
            {application ? (
              <ApplicationPanel
                application={application}
                events={applicationEvents}
                onCopyText={onCopyText}
                onSaveEdit={onSaveGreetingEdit}
                onUpdateFollowUp={onUpdateFollowUp}
                onUpdateStatus={onUpdateApplicationStatus}
              />
            ) : null}
          </>
        ) : null}

        {activeTool === "versions" ? (
          <VersionComparePanel
            applications={applicationHistory}
            onCopyText={onCopyText}
            resumes={resumeHistory}
          />
        ) : null}
      </div>
    </article>
  );
}

function ToolTab({
  activeTool,
  Icon,
  label,
  onToolChange,
  tool
}: {
  activeTool: JobCardTool;
  Icon: typeof BarChart3;
  label: string;
  onToolChange: (tool: JobCardTool) => void;
  tool: JobCardTool;
}) {
  return (
    <button
      aria-pressed={activeTool === tool}
      className="job-tool-tab"
      onClick={() => onToolChange(tool)}
      type="button"
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function ResumeVariantActions({
  disabled,
  jobId,
  onGenerateResume
}: {
  disabled: boolean;
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
          className="panel-action-button"
          disabled={disabled}
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
  disabled,
  jobId,
  onGenerateGreeting
}: {
  disabled: boolean;
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
          className="panel-action-button"
          disabled={disabled}
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
