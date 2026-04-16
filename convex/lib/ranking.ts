import { z } from "zod/v3";

export const rankingVersion = "candidate-ranking-v1";
export const promptVersion = "search-intake-v1";
export const defaultRankingModel = "claude-sonnet-4-20250514";

export const searchCriteriaSchema = z.object({
  roleTitle: z.string(),
  stack: z.array(z.string()),
  domain: z.string(),
  seniority: z.string().optional(),
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()),
  evidenceSignals: z.array(z.string()),
  sharpeningQuestions: z.array(z.string()),
});

export type SearchCriteria = z.infer<typeof searchCriteriaSchema>;

export type CandidateEvidenceStub = {
  evidenceId: string;
  kind: "repo" | "blog" | "talk" | "community" | "employment" | "network";
  title: string;
  snippet: string;
  url?: string;
  strength: number;
  recencyYears: number;
  tags: string[];
  relevanceDisplay?: string;
};

export type NetworkConnectionStub = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  channels: Array<{
    type:
      | "github"
      | "twitter"
      | "slack"
      | "conference"
      | "company"
      | "university"
      | "oss";
    detail: string;
  }>;
  strength: "strong" | "medium" | "weak";
  lastInteraction: string;
  sharedProjects: number;
  relationship: string;
};

export type CandidateStub = {
  slug: string;
  fullName: string;
  headline: string;
  summary: string;
  location?: string;
  currentCompany?: string;
  profileUrl?: string;
  email?: string;
  warmIntroPath?: string;
  yearsExperience: number;
  seniority: string;
  stacks: string[];
  domains: string[];
  roleKeywords: string[];
  signalConfidence: number;
  reachabilityScore: number;
  evidence: CandidateEvidenceStub[];
  networkConnections?: NetworkConnectionStub[];
  companyLogoUrl?: string;
  socialGithub?: string;
  socialBlog?: string;
  socialTwitter?: string;
  age?: number;
};

export type FactorBreakdown = {
  roleFit: number;
  stackFit: number;
  domainFit: number;
  evidenceStrength: number;
  recency: number;
  signalConfidence: number;
  reachabilityBonus: number;
};

export type RankedCandidateResult = {
  slug: string;
  baseScore: number;
  finalScore: number;
  confidence: number;
  factorBreakdown: FactorBreakdown;
  summaryWhy: string;
  topStrengths: string[];
  risksOrGaps: string[];
  evidenceRefs: Array<{
    evidenceId: string;
    title: string;
    snippet: string;
    url: string | undefined;
  }>;
};

const techKeywords = new Set([
  "react",
  "typescript",
  "javascript",
  "node",
  "graphql",
  "postgres",
  "convex",
  "websockets",
  "realtime",
  "distributed",
  "systems",
  "performance",
  "infra",
  "infrastructure",
  "ai",
  "python",
  "go",
  "rust",
]);

const domainKeywords = new Set([
  "devtools",
  "fintech",
  "ai",
  "infrastructure",
  "platform",
  "marketplace",
  "developer",
  "productivity",
  "recruiting",
  "security",
  "data",
  "collaboration",
]);

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeToken(value)
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => normalizeToken(value)).filter(Boolean))];
}

function mean(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function overlapScore(required: string[], candidate: string[]) {
  const requiredTokens = unique(required);
  if (!requiredTokens.length) {
    return 65;
  }

  const candidateText = unique(candidate).join(" ");
  const matches = requiredTokens.filter((token) => candidateText.includes(token));
  return clamp(20 + (matches.length / requiredTokens.length) * 80);
}

function titleScore(roleTitle: string, candidate: CandidateStub, seniority?: string) {
  const desired = [
    ...tokenize(roleTitle),
    ...(seniority ? tokenize(seniority) : []),
  ];
  const haystack = [
    candidate.headline,
    candidate.summary,
    candidate.seniority,
    ...candidate.roleKeywords,
  ];
  return overlapScore(desired, haystack);
}

function stackScore(criteria: SearchCriteria, candidate: CandidateStub) {
  const mustHaveTech = criteria.mustHave.filter((item) =>
    tokenize(item).some((token) => techKeywords.has(token)),
  );
  return overlapScore(
    [...criteria.stack, ...mustHaveTech],
    [...candidate.stacks, ...candidate.evidence.flatMap((item) => item.tags)],
  );
}

function domainScore(criteria: SearchCriteria, candidate: CandidateStub) {
  const domainHints = criteria.mustHave.filter((item) =>
    tokenize(item).some((token) => domainKeywords.has(token)),
  );
  return overlapScore(
    [criteria.domain, ...domainHints, ...criteria.niceToHave],
    [...candidate.domains, candidate.summary],
  );
}

function evidenceScore(criteria: SearchCriteria, candidate: CandidateStub) {
  const evidenceSignals = unique(criteria.evidenceSignals);
  const evidenceMatches = candidate.evidence.filter((item) => {
    if (!evidenceSignals.length) {
      return true;
    }

    const tagText = unique(item.tags).join(" ");
    return evidenceSignals.some((signal) => tagText.includes(normalizeToken(signal)));
  });

  const relevantEvidence = evidenceMatches.length ? evidenceMatches : candidate.evidence;
  const strengthScore = mean(relevantEvidence.map((item) => item.strength * 100));
  const breadthBonus = clamp(candidate.evidence.length * 6, 0, 20);
  return clamp(strengthScore * 0.85 + breadthBonus);
}

function recencyScore(candidate: CandidateStub) {
  const averageYears = mean(candidate.evidence.map((item) => item.recencyYears));
  return clamp(100 - averageYears * 18, 30, 100);
}

function confidenceScore(candidate: CandidateStub) {
  return clamp(candidate.signalConfidence * 100);
}

function reachabilityScore(candidate: CandidateStub) {
  return clamp(candidate.reachabilityScore * 100);
}

function buildFactorBreakdown(criteria: SearchCriteria, candidate: CandidateStub) {
  return {
    roleFit: titleScore(criteria.roleTitle, candidate, criteria.seniority),
    stackFit: stackScore(criteria, candidate),
    domainFit: domainScore(criteria, candidate),
    evidenceStrength: evidenceScore(criteria, candidate),
    recency: recencyScore(candidate),
    signalConfidence: confidenceScore(candidate),
    reachabilityBonus: reachabilityScore(candidate),
  } satisfies FactorBreakdown;
}

function weightedScore(breakdown: FactorBreakdown) {
  return clamp(
    breakdown.roleFit * 0.22 +
      breakdown.stackFit * 0.24 +
      breakdown.domainFit * 0.18 +
      breakdown.evidenceStrength * 0.14 +
      breakdown.recency * 0.08 +
      breakdown.signalConfidence * 0.08 +
      breakdown.reachabilityBonus * 0.06,
  );
}

function buildStrengths(
  criteria: SearchCriteria,
  candidate: CandidateStub,
  breakdown: FactorBreakdown,
) {
  const strengths: string[] = [];

  if (breakdown.stackFit >= 72) {
    strengths.push(
      `Strong stack overlap across ${candidate.stacks.slice(0, 3).join(", ")}.`,
    );
  }

  if (breakdown.domainFit >= 70) {
    strengths.push(
      `Relevant domain background in ${candidate.domains.slice(0, 2).join(" and ")}.`,
    );
  }

  if (breakdown.evidenceStrength >= 70) {
    strengths.push(
      `Evidence quality is strong with ${candidate.evidence.length} concrete proof points.`,
    );
  }

  if (criteria.evidenceSignals.length) {
    const matchedSignals = criteria.evidenceSignals.filter((signal) =>
      candidate.evidence.some((item) =>
        item.tags.join(" ").toLowerCase().includes(normalizeToken(signal)),
      ),
    );
    if (matchedSignals.length) {
      strengths.push(
        `Matches requested evidence signals like ${matchedSignals
          .slice(0, 2)
          .join(", ")}.`,
      );
    }
  }

  return strengths.slice(0, 3);
}

function buildRisks(criteria: SearchCriteria, candidate: CandidateStub, breakdown: FactorBreakdown) {
  const risks: string[] = [];

  if (breakdown.domainFit < 58 && criteria.domain) {
    risks.push(`Domain fit is less direct than the target ${criteria.domain} profile.`);
  }

  if (breakdown.stackFit < 60) {
    risks.push("Some requested technologies are implied rather than strongly evidenced.");
  }

  if (breakdown.reachabilityBonus < 45) {
    risks.push("No especially warm intro path surfaced in the current data.");
  }

  if (candidate.evidence.length < 2) {
    risks.push("Evidence depth is thin and may need more enrichment from Clay.");
  }

  return risks.slice(0, 3);
}

function buildSummary(candidate: CandidateStub, breakdown: FactorBreakdown) {
  const strongestFactor = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0]?.[0];
  const factorLabel =
    strongestFactor === "roleFit"
      ? "role fit"
      : strongestFactor === "stackFit"
        ? "stack fit"
        : strongestFactor === "domainFit"
          ? "domain alignment"
          : strongestFactor === "evidenceStrength"
            ? "evidence trail"
            : strongestFactor === "recency"
              ? "recent work"
              : strongestFactor === "signalConfidence"
                ? "signal confidence"
                : "reachability";

  return `${candidate.fullName} ranks well because of strong ${factorLabel}, backed by verifiable work across ${candidate.stacks
    .slice(0, 2)
    .join(" and ")}.`;
}

function selectEvidence(criteria: SearchCriteria, candidate: CandidateStub) {
  const promptSignals = unique([
    criteria.roleTitle,
    criteria.domain,
    ...criteria.stack,
    ...criteria.mustHave,
    ...criteria.evidenceSignals,
  ]);

  return [...candidate.evidence]
    .sort((left, right) => {
      const leftMatches = promptSignals.filter((signal) =>
        [...left.tags, left.title, left.snippet].join(" ").toLowerCase().includes(signal),
      ).length;
      const rightMatches = promptSignals.filter((signal) =>
        [...right.tags, right.title, right.snippet].join(" ").toLowerCase().includes(signal),
      ).length;

      if (leftMatches !== rightMatches) {
        return rightMatches - leftMatches;
      }

      return right.strength - left.strength;
    })
    .slice(0, 3)
    .map((item) => ({
      evidenceId: item.evidenceId,
      title: item.title,
      snippet: item.snippet,
      url: item.url,
    }));
}

export function parseCriteria(criteriaJson?: string) {
  if (!criteriaJson) {
    return null;
  }

  try {
    return searchCriteriaSchema.parse(JSON.parse(criteriaJson));
  } catch {
    return null;
  }
}

export function extractCriteriaFallback(prompt: string, companyContext?: string) {
  const combined = `${prompt}\n${companyContext ?? ""}`.toLowerCase();
  const techMatches = [...techKeywords].filter((keyword) => combined.includes(keyword));
  const domainMatch = [...domainKeywords].find((keyword) => combined.includes(keyword)) ?? "";
  const seniorityMatch =
    ["staff", "principal", "senior", "lead", "manager"].find((keyword) =>
      combined.includes(keyword),
    ) ?? undefined;

  const evidenceSignals = [
    "open source",
    "talks",
    "blogs",
    "distributed systems",
    "performance",
    "developer tools",
  ].filter((keyword) => combined.includes(keyword));

  return {
    roleTitle: prompt.split(/,|\n/)[0]?.trim() || "Engineer",
    stack: techMatches,
    domain: domainMatch,
    seniority: seniorityMatch,
    mustHave: techMatches.slice(0, 3),
    niceToHave: techMatches.slice(3, 5),
    evidenceSignals,
    sharpeningQuestions: [
      "Should the ranking weight open source work more heavily than proprietary product work?",
      "Do warm introductions matter, or should ranking stay purely capability-based?",
      "Are you optimizing for immediate execution or long-term technical leadership?",
    ],
  } satisfies SearchCriteria;
}

export function scoreCandidate(criteria: SearchCriteria, candidate: CandidateStub) {
  const factorBreakdown = buildFactorBreakdown(criteria, candidate);
  const baseScore = weightedScore(factorBreakdown);
  const confidence = clamp(
    factorBreakdown.signalConfidence * 0.45 + factorBreakdown.evidenceStrength * 0.55,
  );

  return {
    slug: candidate.slug,
    baseScore,
    finalScore: baseScore,
    confidence,
    factorBreakdown,
    summaryWhy: buildSummary(candidate, factorBreakdown),
    topStrengths: buildStrengths(criteria, candidate, factorBreakdown),
    risksOrGaps: buildRisks(criteria, candidate, factorBreakdown),
    evidenceRefs: selectEvidence(criteria, candidate),
  } satisfies RankedCandidateResult;
}

export function rankCandidatesDeterministically(
  criteria: SearchCriteria,
  candidates: CandidateStub[],
) {
  return candidates
    .map((candidate) => scoreCandidate(criteria, candidate))
    .sort((left, right) => right.finalScore - left.finalScore)
    .map((result, index) => ({
      ...result,
      finalScore: clamp(result.finalScore - index * 0.25),
    }));
}
