import type {
  CandidatePreference,
  JobAnalysisCreateInput,
  JobPosting
} from "@boss-jobpilot/shared";

export type JobMatchScore = {
  total: number;
  recommendation: "prioritize" | "apply" | "cautious" | "skip";
  matchedKeywords: string[];
  riskFlags: string[];
};

const skillKeywords = [
  "React",
  "Vue",
  "Angular",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "NestJS",
  "Express",
  "Next.js",
  "Python",
  "Java",
  "Go",
  "Rust",
  "SQL",
  "MySQL",
  "PostgreSQL",
  "Redis",
  "MongoDB",
  "Docker",
  "Kubernetes",
  "AWS",
  "AI",
  "LLM",
  "OpenAI",
  "RAG",
  "Prompt",
  "API",
  "Git"
];

const bonusSignals = ["bonus", "preferred", "plus", "nice to have", "加分", "优先"];

function includesAny(source: string, keywords: string[]) {
  return keywords.filter((keyword) => source.toLowerCase().includes(keyword.toLowerCase()));
}

export function computeJobMatchScore(
  job: JobPosting,
  preference: CandidatePreference
): JobMatchScore {
  const source = [job.title, job.jdRaw, job.companyName, job.city].filter(Boolean).join("\n");
  const matchedKeywords = includesAny(source, preference.preferredKeywords);
  const riskFlags = includesAny(source, preference.blockedKeywords);

  let total = 45;
  total += Math.min(matchedKeywords.length * 12, 36);

  if (preference.targetRoles.some((role) => job.title.includes(role))) {
    total += 12;
  }

  if (job.city && preference.targetCities.includes(job.city)) {
    total += 7;
  }

  total -= Math.min(riskFlags.length * 18, 36);
  total = Math.max(0, Math.min(100, total));

  const recommendation =
    total >= 80 ? "prioritize" : total >= 62 ? "apply" : total >= 45 ? "cautious" : "skip";

  return {
    total,
    recommendation,
    matchedKeywords,
    riskFlags
  };
}

export function analyzeJobPosting(
  job: JobPosting,
  preference: CandidatePreference
): JobAnalysisCreateInput {
  const source = [job.title, job.jdRaw, job.companyName, job.city].filter(Boolean).join("\n");
  const score = computeJobMatchScore(job, preference);
  const requiredSkills = includesAny(source, skillKeywords);
  const bonusSkills = extractBonusSkills(job.jdRaw, requiredSkills);

  return {
    jobId: job.id,
    matchScore: score.total,
    recommendation: score.recommendation,
    matchedKeywords: score.matchedKeywords,
    requiredSkills,
    bonusSkills,
    matchedExperienceIds: [],
    riskFlags: score.riskFlags,
    resumeStrategy: buildResumeStrategy(job, score, requiredSkills),
    modelName: "rule-based",
    promptVersion: "rule-based-job-analysis@0.1.0"
  };
}

function extractBonusSkills(jdRaw: string, requiredSkills: string[]) {
  const lines = jdRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bonusLines = lines.filter((line) => includesAny(line, bonusSignals).length > 0);
  const bonusSource = bonusLines.join("\n");

  if (!bonusSource) {
    return [];
  }

  return includesAny(bonusSource, requiredSkills);
}

function buildResumeStrategy(job: JobPosting, score: JobMatchScore, requiredSkills: string[]) {
  const titlePart = job.companyName ? `${job.companyName} ${job.title}` : job.title;
  const skillPart =
    requiredSkills.length > 0
      ? `优先突出 ${requiredSkills.slice(0, 5).join("、")} 相关项目和可量化成果。`
      : "优先突出与岗位职责最接近的项目、职责范围和可量化成果。";
  const riskPart =
    score.riskFlags.length > 0
      ? `投递前核对风险信号：${score.riskFlags.join("、")}。`
      : "当前未命中明显风险词，可进入简历定制。";

  return `针对 ${titlePart}，${skillPart}${riskPart}`;
}
