import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const connectionChannelValidator = v.union(
  v.literal("github"),
  v.literal("twitter"),
  v.literal("slack"),
  v.literal("conference"),
  v.literal("company"),
  v.literal("university"),
  v.literal("oss"),
);

const networkConnectionValidator = v.object({
  id: v.string(),
  name: v.string(),
  avatar: v.string(),
  role: v.string(),
  channels: v.array(
    v.object({
      type: connectionChannelValidator,
      detail: v.string(),
    }),
  ),
  strength: v.union(
    v.literal("strong"),
    v.literal("medium"),
    v.literal("weak"),
  ),
  lastInteraction: v.string(),
  sharedProjects: v.number(),
  relationship: v.string(),
});

export default defineSchema({
  searchRequests: defineTable({
    threadId: v.string(),
    rawPrompt: v.string(),
    companyContext: v.optional(v.string()),
    criteriaJson: v.string(),
    status: v.union(
      v.literal("ready_for_clay"),
      v.literal("clay_queued"),
      v.literal("importing_candidates"),
      v.literal("ranking"),
      v.literal("ranked"),
      v.literal("error"),
    ),
    promptVersion: v.string(),
    rankingVersion: v.optional(v.string()),
    latestRankingRunId: v.optional(v.id("rankingRuns")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_threadId", ["threadId"])
    .index("by_status", ["status"]),

  candidates: defineTable({
    requestId: v.id("searchRequests"),
    slug: v.string(),
    fullName: v.string(),
    headline: v.string(),
    summary: v.string(),
    location: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    warmIntroPath: v.optional(v.string()),
    yearsExperience: v.number(),
    seniority: v.string(),
    stacks: v.array(v.string()),
    domains: v.array(v.string()),
    roleKeywords: v.array(v.string()),
    signalConfidence: v.number(),
    reachabilityScore: v.number(),
    networkConnections: v.optional(v.array(networkConnectionValidator)),
    companyLogoUrl: v.optional(v.string()),
    socialGithub: v.optional(v.string()),
    socialBlog: v.optional(v.string()),
    socialTwitter: v.optional(v.string()),
    age: v.optional(v.number()),
  })
    .index("by_requestId", ["requestId"])
    .index("by_requestId_and_slug", ["requestId", "slug"]),

  candidateEvidence: defineTable({
    requestId: v.id("searchRequests"),
    candidateId: v.id("candidates"),
    evidenceId: v.string(),
    kind: v.union(
      v.literal("repo"),
      v.literal("blog"),
      v.literal("talk"),
      v.literal("community"),
      v.literal("employment"),
      v.literal("network"),
    ),
    title: v.string(),
    snippet: v.string(),
    url: v.optional(v.string()),
    strength: v.number(),
    recencyYears: v.number(),
    tags: v.array(v.string()),
    relevanceDisplay: v.optional(v.string()),
  })
    .index("by_requestId_and_candidateId", ["requestId", "candidateId"])
    .index("by_candidateId", ["candidateId"]),

  rankingRuns: defineTable({
    requestId: v.id("searchRequests"),
    threadId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("fallback"),
      v.literal("error"),
    ),
    rankingVersion: v.string(),
    promptVersion: v.string(),
    modelId: v.string(),
    candidateCount: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_requestId", ["requestId"])
    .index("by_requestId_and_startedAt", ["requestId", "startedAt"])
    .index("by_threadId", ["threadId"]),

  candidateScores: defineTable({
    requestId: v.id("searchRequests"),
    rankingRunId: v.id("rankingRuns"),
    candidateId: v.id("candidates"),
    rank: v.number(),
    baseScore: v.number(),
    finalScore: v.number(),
    confidence: v.number(),
    summaryWhy: v.string(),
    topStrengths: v.array(v.string()),
    risksOrGaps: v.array(v.string()),
    evidenceRefIds: v.array(v.id("candidateEvidence")),
    factorBreakdown: v.object({
      roleFit: v.number(),
      stackFit: v.number(),
      domainFit: v.number(),
      evidenceStrength: v.number(),
      recency: v.number(),
      signalConfidence: v.number(),
      reachabilityBonus: v.number(),
    }),
  })
    .index("by_requestId_and_rank", ["requestId", "rank"])
    .index("by_rankingRunId_and_rank", ["rankingRunId", "rank"])
    .index("by_candidateId", ["candidateId"]),

  rankingFeedback: defineTable({
    requestId: v.id("searchRequests"),
    scoreId: v.id("candidateScores"),
    disposition: v.union(
      v.literal("thumbs_up"),
      v.literal("thumbs_down"),
      v.literal("hide"),
      v.literal("promote"),
    ),
    note: v.optional(v.string()),
  }).index("by_scoreId", ["scoreId"]),

  candidatePool: defineTable({
    name: v.string(),
    linkedinUrl: v.optional(v.string()),
    currentTitle: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    location: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    jobTitleLevels: v.optional(v.array(v.string())),
    jobTitleSubRole: v.optional(v.string()),
    jobTitleRole: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    importedAt: v.number(),
  }).index("by_linkedinUrl", ["linkedinUrl"]),

  searches: defineTable({
    query: v.string(),
    company: v.optional(v.string()),
    lookingFor: v.optional(v.string()),
    chips: v.optional(v.array(v.string())),
    apolloParams: v.optional(v.any()),
    pdlParams: v.optional(v.any()),
    status: v.union(
      v.literal("searching"),
      v.literal("enriching"),
      v.literal("complete"),
      v.literal("error"),
    ),
    candidateCount: v.number(),
    createdAt: v.number(),
  }),

  talentCandidates: defineTable({
    searchId: v.id("searches"),
    name: v.string(),
    currentTitle: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    apolloId: v.optional(v.string()),
    pdlId: v.optional(v.string()),
    pdlScore: v.optional(v.number()),
    enriched: v.boolean(),
    enrichedAt: v.optional(v.number()),
    skills: v.optional(v.array(v.string())),
    accomplishmentSummary: v.optional(v.string()),
    movabilityScore: v.optional(v.number()),
    movabilityReason: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    rawClayData: v.optional(v.any()),
  })
    .index("by_searchId", ["searchId"])
    .index("by_linkedinUrl", ["linkedinUrl"]),
});
