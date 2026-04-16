import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const connectionChannelValidator = v.union(
  v.literal("github"),
  v.literal("twitter"),
  v.literal("slack"),
  v.literal("conference"),
  v.literal("company"),
  v.literal("university"),
  v.literal("oss")
)

const networkConnectionValidator = v.object({
  id: v.string(),
  name: v.string(),
  avatar: v.string(),
  role: v.string(),
  channels: v.array(
    v.object({
      type: connectionChannelValidator,
      detail: v.string(),
    })
  ),
  strength: v.union(
    v.literal("strong"),
    v.literal("medium"),
    v.literal("weak")
  ),
  lastInteraction: v.string(),
  sharedProjects: v.number(),
  relationship: v.string(),
})

const enrichmentStatusValidator = v.union(
  v.literal("ready"),
  v.literal("queued"),
  v.literal("complete"),
  v.literal("failed")
)

export default defineSchema({
  searchRequests: defineTable({
    threadId: v.string(),
    rawPrompt: v.string(),
    companyContext: v.optional(v.string()),
    criteriaJson: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("searching"),
      v.literal("ranking"),
      v.literal("ranked"),
      v.literal("enriching"),
      v.literal("error")
    ),
    promptVersion: v.string(),
    rankingVersion: v.optional(v.string()),
    latestRankingRunId: v.optional(v.id("rankingRuns")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_threadId", ["threadId"])
    .index("by_status", ["status"]),

  people: defineTable({
    linkedinUrl: v.string(),
    fullName: v.string(),
    headline: v.optional(v.string()),
    summary: v.optional(v.string()),
    location: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    email: v.optional(v.string()),
    stacks: v.array(v.string()),
    domains: v.array(v.string()),
    yearsExperience: v.optional(v.number()),
    socialGithub: v.optional(v.string()),
    socialTwitter: v.optional(v.string()),
    socialBlog: v.optional(v.string()),
    companyLogoUrl: v.optional(v.string()),
    pdlId: v.optional(v.string()),
    pdlData: v.optional(v.any()),
    clayEnriched: v.boolean(),
    enrichmentStatus: v.optional(enrichmentStatusValidator),
    enrichmentRequestedAt: v.optional(v.number()),
    enrichmentCompletedAt: v.optional(v.number()),
    enrichmentError: v.optional(v.string()),
  }).index("by_linkedinUrl", ["linkedinUrl"]),

  candidates: defineTable({
    requestId: v.id("searchRequests"),
    personId: v.id("people"),
    slug: v.string(),
    seniority: v.string(),
    roleKeywords: v.array(v.string()),
    signalConfidence: v.number(),
    reachabilityScore: v.number(),
    warmIntroPath: v.optional(v.string()),
    networkConnections: v.optional(v.array(networkConnectionValidator)),
    pdlScore: v.optional(v.number()),
    age: v.optional(v.number()),
    outreachEmail: v.optional(v.string()),
  })
    .index("by_requestId", ["requestId"])
    .index("by_requestId_and_slug", ["requestId", "slug"])
    .index("by_personId", ["personId"]),

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
      v.literal("network")
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
      v.literal("error")
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
      v.literal("promote")
    ),
    note: v.optional(v.string()),
  }).index("by_scoreId", ["scoreId"]),
})
