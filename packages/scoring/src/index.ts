import type { CandidatePreference, JobPosting } from "@boss-jobpilot/shared";

export type JobMatchScore = {
  total: number;
  recommendation: "prioritize" | "apply" | "cautious" | "skip";
  matchedKeywords: string[];
  riskFlags: string[];
};

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
