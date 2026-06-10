import { useMemo, useState } from "react";

import { RefreshCw, TrendingUp } from "lucide-react";

import type {
  ApplicationReviewStrategyRecap,
  AiGenerationRun,
  JobPosting
} from "@boss-jobpilot/shared";

import type { AiProviderHealth } from "./api";
import {
  defaultApplicationReviewFilters,
  formatReviewRate,
  type ApplicationReviewAttributionGroup,
  type ApplicationReviewDistributionItem,
  type ApplicationReviewFilters,
  type ApplicationReviewRecommendationFilter,
  type ApplicationReviewStatusFilter,
  type ApplicationReviewStrategySuggestion,
  type ApplicationReviewSummary
} from "./application-review";
import {
  boardStageLabels,
  boardStageOrder,
  recommendationLabels,
  recommendationOrder
} from "./job-labels";

export function ApplicationReviewPanel({
  aiGenerationRuns,
  aiProviderHealth,
  aiProviderHealthError,
  cityOptions,
  filters,
  isAiProviderHealthLoading,
  isStrategyRecapLoading,
  onFiltersChange,
  onRefreshAiProviderHealth,
  strategyRecap,
  strategyRecapError,
  summary,
  jobs,
  totalJobs
}: {
  aiGenerationRuns: AiGenerationRun[];
  aiProviderHealth: AiProviderHealth | null;
  aiProviderHealthError: string | null;
  cityOptions: string[];
  filters: ApplicationReviewFilters;
  isAiProviderHealthLoading: boolean;
  isStrategyRecapLoading: boolean;
  onFiltersChange: (filters: ApplicationReviewFilters) => void;
  onRefreshAiProviderHealth: () => void;
  strategyRecap: ApplicationReviewStrategyRecap | null;
  strategyRecapError: string | null;
  summary: ApplicationReviewSummary;
  jobs: JobPosting[];
  totalJobs: number;
}) {
  const denominator = summary.statusTotal || summary.totalJobs;
  const isFiltered =
    filters.city !== defaultApplicationReviewFilters.city ||
    filters.recommendation !== defaultApplicationReviewFilters.recommendation ||
    filters.status !== defaultApplicationReviewFilters.status;
  const metrics = [
    {
      detail: `${summary.appliedOrBeyond}/${denominator} 个岗位已推进到投递后`,
      label: "投递推进率",
      value: formatReviewRate(summary.appliedOrBeyond, denominator)
    },
    {
      detail: `${summary.replyCount}/${summary.appliedOrBeyond} 个已投递岗位有回复`,
      label: "回复率",
      value: formatReviewRate(summary.replyCount, summary.appliedOrBeyond)
    },
    {
      detail: `${summary.interviewOrOffer}/${summary.appliedOrBeyond} 个已投递岗位进入面试或 Offer`,
      label: "面试转化",
      value: formatReviewRate(summary.interviewOrOffer, summary.appliedOrBeyond)
    },
    {
      detail:
        summary.averageMatchScore === undefined
          ? "暂无岗位分析"
          : `${summary.generatedPackages} 个岗位已有简历草稿`,
      label: "平均匹配分",
      value: summary.averageMatchScore === undefined ? "-" : `${summary.averageMatchScore}/100`
    }
  ];
  const alerts = [
    summary.overdueFollowUps > 0 ? `${summary.overdueFollowUps} 个岗位跟进已逾期` : undefined,
    summary.staleActiveApplications > 0
      ? `${summary.staleActiveApplications} 个推进中岗位未设置下次跟进`
      : undefined
  ].filter((alert): alert is string => Boolean(alert));

  return (
    <section className="review-panel" aria-label="投递复盘">
      <div className="review-panel__header">
        <div>
          <p className="eyebrow">
            <TrendingUp size={16} />
            投递复盘
          </p>
          <h3>效果概览</h3>
        </div>
        <span>
          {summary.totalJobs}/{totalJobs} 个岗位纳入复盘 · {summary.activeApplications} 个已生成话术
        </span>
      </div>

      <AiProviderHealthCard
        error={aiProviderHealthError}
        health={aiProviderHealth}
        isLoading={isAiProviderHealthLoading}
        onRefresh={onRefreshAiProviderHealth}
      />

      <AiGenerationRunList jobs={jobs} runs={aiGenerationRuns} />

      <div className="review-controls" aria-label="复盘筛选">
        <label>
          状态
          <select
            value={filters.status}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: event.target.value as ApplicationReviewStatusFilter
              })
            }
          >
            <option value="all">全部状态</option>
            {boardStageOrder.map((stage) => (
              <option key={stage} value={stage}>
                {boardStageLabels[stage]}
              </option>
            ))}
          </select>
        </label>
        <label>
          投递建议
          <select
            value={filters.recommendation}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                recommendation: event.target.value as ApplicationReviewRecommendationFilter
              })
            }
          >
            <option value="all">全部建议</option>
            <option value="unanalyzed">未分析</option>
            {recommendationOrder.map((recommendation) => (
              <option key={recommendation} value={recommendation}>
                {recommendationLabels[recommendation]}
              </option>
            ))}
          </select>
        </label>
        <label>
          城市
          <select
            value={filters.city}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                city: event.target.value
              })
            }
          >
            <option value="all">全部城市</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <button
          className="panel-action-button"
          disabled={!isFiltered}
          onClick={() => onFiltersChange(defaultApplicationReviewFilters)}
          type="button"
        >
          重置
        </button>
      </div>

      <div className="review-metrics">
        {metrics.map((metric) => (
          <article className="review-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </div>

      {alerts.length > 0 ? (
        <div className="review-alerts">
          {alerts.map((alert) => (
            <span key={alert}>{alert}</span>
          ))}
        </div>
      ) : null}

      <div className="review-strategy" aria-label="策略建议">
        <strong>策略建议</strong>
        <div>
          {summary.strategySuggestions.map((suggestion) => (
            <ReviewStrategySuggestionItem key={suggestion.title} suggestion={suggestion} />
          ))}
        </div>
      </div>

      <ReviewStrategyRecapPanel
        error={strategyRecapError}
        isLoading={isStrategyRecapLoading}
        recap={strategyRecap}
      />

      <div className="review-distributions">
        <ReviewDistribution items={summary.recommendationDistribution} title="投递建议分布" />
        <ReviewDistribution items={summary.cityDistribution} title="城市分布" />
        <ReviewDistribution items={summary.versionDistribution} title="版本迭代" />
      </div>

      <div className="review-attribution" aria-label="效果归因">
        {summary.attributionGroups.map((group) => (
          <ReviewAttributionGroup group={group} key={group.title} />
        ))}
      </div>
    </section>
  );
}

function AiProviderHealthCard({
  error,
  health,
  isLoading,
  onRefresh
}: {
  error: string | null;
  health: AiProviderHealth | null;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const status = error ? "failed" : (health?.status ?? "not_configured");
  const title = getAiProviderHealthTitle(status);
  const meta = health?.providerName
    ? `${health.providerName} · ${formatHealthCheckedAt(health.checkedAt)}`
    : formatHealthCheckedAt(health?.checkedAt);
  const detail = error ?? health?.detail;

  return (
    <div className={`ai-provider-health ai-provider-health--${status}`}>
      <div>
        <div>
          <strong>{title}</strong>
          <span>{meta}</span>
        </div>
        <p>{error ?? health?.message ?? "正在检查 AI Provider 状态"}</p>
        {detail ? <small>{detail}</small> : null}
      </div>
      <button className="panel-action-button" disabled={isLoading} onClick={onRefresh} type="button">
        <RefreshCw size={14} />
        {isLoading ? "检查中" : "刷新"}
      </button>
    </div>
  );
}

function AiGenerationRunList({ jobs, runs }: { jobs: JobPosting[]; runs: AiGenerationRun[] }) {
  const [featureFilter, setFeatureFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AiGenerationRun["status"]>("all");
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const featureOptions = useMemo(
    () => Array.from(new Set(runs.map((run) => run.feature))).sort(),
    [runs]
  );
  const jobOptions = useMemo(
    () =>
      Array.from(
        new Set(
          runs
            .map((run) => run.relatedJobId)
            .filter((jobId): jobId is string => Boolean(jobId))
        )
      ).sort((left, right) =>
        getAiGenerationJobLabel(left, jobById).localeCompare(getAiGenerationJobLabel(right, jobById))
      ),
    [jobById, runs]
  );
  const filteredRuns = runs.filter((run) => {
    if (featureFilter !== "all" && run.feature !== featureFilter) {
      return false;
    }

    if (statusFilter !== "all" && run.status !== statusFilter) {
      return false;
    }

    if (jobFilter !== "all" && run.relatedJobId !== jobFilter) {
      return false;
    }

    return true;
  });
  const visibleRuns = filteredRuns.slice(0, 8);
  const selectedRun =
    filteredRuns.find((run) => run.id === selectedRunId) ?? filteredRuns[0] ?? null;
  const isFiltered = featureFilter !== "all" || statusFilter !== "all" || jobFilter !== "all";

  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="ai-generation-runs" aria-label="最近 AI 生成记录">
      <div className="ai-generation-runs__header">
        <strong>最近 AI 生成</strong>
        <span>
          {filteredRuns.length}/{runs.length}
        </span>
      </div>

      <div className="ai-generation-filters">
        <label>
          能力
          <select value={featureFilter} onChange={(event) => setFeatureFilter(event.target.value)}>
            <option value="all">全部能力</option>
            {featureOptions.map((feature) => (
              <option key={feature} value={feature}>
                {formatAiGenerationFeature(feature)}
              </option>
            ))}
          </select>
        </label>
        <label>
          状态
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | AiGenerationRun["status"])
            }
          >
            <option value="all">全部状态</option>
            <option value="provider_success">模型成功</option>
            <option value="provider_fallback">已降级</option>
            <option value="rule_based">规则版</option>
          </select>
        </label>
        <label>
          岗位
          <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
            <option value="all">全部岗位</option>
            {jobOptions.map((jobId) => (
              <option key={jobId} value={jobId}>
                {getAiGenerationJobLabel(jobId, jobById)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="panel-action-button"
          disabled={!isFiltered}
          onClick={() => {
            setFeatureFilter("all");
            setStatusFilter("all");
            setJobFilter("all");
            setSelectedRunId(null);
          }}
          type="button"
        >
          重置
        </button>
      </div>

      {visibleRuns.length > 0 ? (
        <div className="ai-generation-run-grid">
          {visibleRuns.map((run) => (
            <button
              aria-pressed={selectedRun?.id === run.id}
              className={`ai-generation-run ai-generation-run--${run.status}`}
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              type="button"
            >
              <div>
                <span>{formatAiGenerationFeature(run.feature)}</span>
                <small>{formatAiGenerationStatus(run.status)}</small>
              </div>
              <p>
                {run.providerName ?? run.modelName ?? "rule-based"} · {run.durationMs}ms
                {run.promptVersion ? ` · ${run.promptVersion}` : ""}
              </p>
              <small>{formatHealthCheckedAt(run.createdAt)}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="ai-generation-empty">当前筛选下没有 AI 生成记录。</p>
      )}

      {selectedRun ? (
        <div className="ai-generation-detail" aria-label="AI 生成明细">
          <strong>明细</strong>
          <dl>
            <div>
              <dt>能力</dt>
              <dd>{formatAiGenerationFeature(selectedRun.feature)}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{formatAiGenerationStatus(selectedRun.status)}</dd>
            </div>
            <div>
              <dt>岗位</dt>
              <dd>{getAiGenerationJobLabel(selectedRun.relatedJobId, jobById)}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{selectedRun.providerName ?? "rule-based"}</dd>
            </div>
            <div>
              <dt>模型</dt>
              <dd>{selectedRun.modelName ?? "未记录"}</dd>
            </div>
            <div>
              <dt>Prompt</dt>
              <dd>{selectedRun.promptVersion ?? "未记录"}</dd>
            </div>
            <div>
              <dt>耗时</dt>
              <dd>{selectedRun.durationMs}ms</dd>
            </div>
            <div>
              <dt>时间</dt>
              <dd>{formatHealthCheckedAt(selectedRun.createdAt)}</dd>
            </div>
            {selectedRun.errorMessage ? (
              <div>
                <dt>错误</dt>
                <dd>{selectedRun.errorMessage}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
      {filteredRuns.length > visibleRuns.length ? (
        <small className="ai-generation-more">还有 {filteredRuns.length - visibleRuns.length} 条未显示。</small>
      ) : null}
    </div>
  );
}

function getAiGenerationJobLabel(
  jobId: string | undefined,
  jobById: Map<string, JobPosting>
) {
  if (!jobId) {
    return "未关联岗位";
  }

  const job = jobById.get(jobId);

  if (!job) {
    return jobId;
  }

  return [job.title, job.companyName].filter(Boolean).join(" / ");
}

function formatAiGenerationFeature(feature: string) {
  const labels: Record<string, string> = {
    "application-review-strategy": "策略复盘",
    "greeting-generation": "打招呼语",
    "instant-job-analysis": "即时分析",
    "job-analysis": "岗位分析",
    "resume-generation": "定制简历"
  };

  return labels[feature] ?? feature;
}

function formatAiGenerationStatus(status: AiGenerationRun["status"]) {
  if (status === "provider_success") {
    return "模型成功";
  }

  if (status === "provider_fallback") {
    return "已降级";
  }

  return "规则版";
}

function getAiProviderHealthTitle(status: AiProviderHealth["status"]) {
  if (status === "ok") {
    return "AI Provider 可用";
  }

  if (status === "failed") {
    return "AI Provider 验证失败";
  }

  return "AI Provider 未配置";
}

function formatHealthCheckedAt(value?: string) {
  if (!value) {
    return "尚未检查";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function ReviewStrategySuggestionItem({
  suggestion
}: {
  suggestion: ApplicationReviewStrategySuggestion;
}) {
  const priorityLabel = {
    high: "高",
    low: "低",
    medium: "中"
  }[suggestion.priority];

  return (
    <article className={`review-strategy-item review-strategy-item--${suggestion.priority}`}>
      <div>
        <span>{priorityLabel}</span>
        <strong>{suggestion.title}</strong>
      </div>
      <p>{suggestion.detail}</p>
      <small>{suggestion.action}</small>
    </article>
  );
}

function ReviewStrategyRecapPanel({
  error,
  isLoading,
  recap
}: {
  error: string | null;
  isLoading: boolean;
  recap: ApplicationReviewStrategyRecap | null;
}) {
  if (isLoading && !recap) {
    return (
      <div className="review-ai-recap" aria-label="AI 策略复盘">
        <strong>AI 策略复盘</strong>
        <p>正在生成复盘摘要...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-ai-recap" aria-label="AI 策略复盘">
        <strong>AI 策略复盘</strong>
        <p>{error}</p>
      </div>
    );
  }

  if (!recap) {
    return null;
  }

  return (
    <div className="review-ai-recap" aria-label="AI 策略复盘">
      <div className="review-ai-recap__header">
        <strong>AI 策略复盘</strong>
        <span>
          {recap.modelName} · {recap.promptVersion}
        </span>
      </div>
      <p>{recap.summary}</p>
      <div>
        <ReviewStrategyRecapList items={recap.focus} title="下一步重点" />
        <ReviewStrategyRecapList items={recap.experiments} title="建议实验" />
        <ReviewStrategyRecapList items={recap.risks} title="风险提醒" />
      </div>
    </div>
  );
}

function ReviewStrategyRecapList({ items, title }: { items: string[]; title: string }) {
  return (
    <section>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ReviewAttributionGroup({ group }: { group: ApplicationReviewAttributionGroup }) {
  return (
    <div className="review-attribution-group">
      <strong>{group.title}</strong>
      {group.items.length > 0 ? (
        <div>
          <div className="review-attribution-heading">
            <span>分组</span>
            <span>回复</span>
            <span>面试</span>
          </div>
          {group.items.map((item) => (
            <article className="review-attribution-row" key={item.label}>
              <div>
                <span>{item.label}</span>
                <small>
                  {item.appliedOrBeyond}/{item.totalJobs} 已投递
                </small>
              </div>
              <strong>{formatReviewRate(item.replyCount, item.appliedOrBeyond)}</strong>
              <small>{formatReviewRate(item.interviewOrOffer, item.appliedOrBeyond)}</small>
            </article>
          ))}
        </div>
      ) : (
        <p>暂无数据</p>
      )}
    </div>
  );
}

function ReviewDistribution({
  items,
  title
}: {
  items: ApplicationReviewDistributionItem[];
  title: string;
}) {
  if (items.length === 0) {
    return (
      <div className="review-distribution">
        <strong>{title}</strong>
        <p>暂无数据</p>
      </div>
    );
  }

  return (
    <div className="review-distribution">
      <strong>{title}</strong>
      <div>
        {items.map((item) => (
          <div className="review-distribution-row" key={item.label}>
            <span>{item.label}</span>
            <div>
              <i style={{ width: `${Math.max(item.rate * 100, 4)}%` }} />
            </div>
            <small>{item.count}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
