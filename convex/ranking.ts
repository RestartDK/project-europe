import { query } from "./_generated/server";
import { v } from "convex/values";

import { deriveInfoSources } from "./lib/infoSources";

const requestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("searching"),
  v.literal("enriching"),
  v.literal("ranking"),
  v.literal("ranked"),
  v.literal("error"),
);

const factorBreakdownValidator = v.object({
  roleFit: v.number(),
  stackFit: v.number(),
  domainFit: v.number(),
  evidenceStrength: v.number(),
  recency: v.number(),
  signalConfidence: v.number(),
  reachabilityBonus: v.number(),
});

const connectionChannelValidator = v.union(
  v.literal("github"),
  v.literal("twitter"),
  v.literal("slack"),
  v.literal("conference"),
  v.literal("company"),
  v.literal("university"),
  v.literal("oss"),
);

const networkConnectionReturnValidator = v.object({
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

const resultRowValidator = v.object({
  scoreId: v.id("candidateScores"),
  candidateId: v.id("candidates"),
  rank: v.number(),
  finalScore: v.number(),
  baseScore: v.number(),
  confidence: v.number(),
  summaryWhy: v.string(),
  slug: v.string(),
  fullName: v.string(),
  headline: v.string(),
  currentCompany: v.optional(v.string()),
  location: v.optional(v.string()),
  stacks: v.array(v.string()),
  profileUrl: v.optional(v.string()),
  companyLogoUrl: v.optional(v.string()),
  infoSources: v.array(
    v.union(
      v.literal("linkedin"),
      v.literal("github"),
      v.literal("x"),
      v.literal("website"),
      v.literal("reddit"),
      v.literal("youtube"),
    ),
  ),
});

export const getSearchResults = query({
  args: { requestId: v.optional(v.id("searchRequests")) },
  returns: v.union(
    v.object({
      requestId: v.id("searchRequests"),
      rawPrompt: v.string(),
      companyContext: v.optional(v.string()),
      criteriaJson: v.string(),
      status: requestStatusValidator,
      promptVersion: v.string(),
      rankingVersion: v.optional(v.string()),
      latestRankingRunId: v.optional(v.id("rankingRuns")),
      rankingNotes: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      results: v.array(resultRowValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const request =
      args.requestId !== undefined
        ? await ctx.db.get(args.requestId)
        : (
            await ctx.db
              .query("searchRequests")
              .order("desc")
              .take(1)
          )[0] ?? null;

    if (!request) {
      return null;
    }

    const scores = await ctx.db
      .query("candidateScores")
      .withIndex("by_requestId_and_rank", (q) => q.eq("requestId", request._id))
      .take(25);

    const results = [];
    for (const score of scores) {
      const candidate = await ctx.db.get(score.candidateId);
      if (!candidate) continue;

      const person = await ctx.db.get(candidate.personId);
      if (!person) continue;

      const evidenceDocs = await ctx.db
        .query("candidateEvidence")
        .withIndex("by_candidateId", (q) => q.eq("candidateId", candidate._id))
        .take(20);

      const infoSources = deriveInfoSources({
        profileUrl: person.linkedinUrl,
        socialGithub: person.socialGithub,
        socialBlog: person.socialBlog,
        socialTwitter: person.socialTwitter,
      }, evidenceDocs);

      results.push({
        scoreId: score._id,
        candidateId: candidate._id,
        rank: score.rank,
        finalScore: score.finalScore,
        baseScore: score.baseScore,
        confidence: score.confidence,
        summaryWhy: score.summaryWhy,
        slug: candidate.slug,
        fullName: person.fullName,
        headline: person.headline ?? "",
        currentCompany: person.currentCompany,
        location: person.location,
        stacks: person.stacks,
        profileUrl: person.linkedinUrl,
        companyLogoUrl: person.companyLogoUrl,
        infoSources,
      });
    }

    const rankingRun = request.latestRankingRunId
      ? await ctx.db.get(request.latestRankingRunId)
      : null;

    return {
      requestId: request._id,
      rawPrompt: request.rawPrompt,
      companyContext: request.companyContext,
      criteriaJson: request.criteriaJson,
      status: request.status,
      promptVersion: request.promptVersion,
      rankingVersion: request.rankingVersion,
      latestRankingRunId: request.latestRankingRunId,
      rankingNotes: rankingRun?.notes,
      errorMessage: request.errorMessage,
      results,
    };
  },
});

export const getCandidateDossier = query({
  args: { scoreId: v.id("candidateScores") },
  returns: v.union(
    v.object({
      scoreId: v.id("candidateScores"),
      candidateId: v.id("candidates"),
      rank: v.number(),
      finalScore: v.number(),
      baseScore: v.number(),
      confidence: v.number(),
      summaryWhy: v.string(),
      topStrengths: v.array(v.string()),
      risksOrGaps: v.array(v.string()),
      factorBreakdown: factorBreakdownValidator,
      networkConnections: v.array(networkConnectionReturnValidator),
      candidate: v.object({
        slug: v.string(),
        fullName: v.string(),
        headline: v.string(),
        summary: v.string(),
        currentCompany: v.optional(v.string()),
        location: v.optional(v.string()),
        profileUrl: v.optional(v.string()),
        email: v.optional(v.string()),
        warmIntroPath: v.optional(v.string()),
        yearsExperience: v.number(),
        seniority: v.string(),
        stacks: v.array(v.string()),
        domains: v.array(v.string()),
        avatarDisplayUrl: v.string(),
        companyLogoUrl: v.optional(v.string()),
        socialGithub: v.optional(v.string()),
        socialBlog: v.optional(v.string()),
        socialTwitter: v.optional(v.string()),
        age: v.optional(v.number()),
      }),
      evidence: v.array(
        v.object({
          evidenceId: v.id("candidateEvidence"),
          title: v.string(),
          kind: v.union(
            v.literal("repo"),
            v.literal("blog"),
            v.literal("talk"),
            v.literal("community"),
            v.literal("employment"),
            v.literal("network"),
          ),
          snippet: v.string(),
          url: v.optional(v.string()),
          tags: v.array(v.string()),
          strength: v.number(),
          recencyYears: v.number(),
          relevanceDisplay: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const score = await ctx.db.get(args.scoreId);
    if (!score) {
      return null;
    }

    const candidate = await ctx.db.get(score.candidateId);
    if (!candidate) return null;

    const person = await ctx.db.get(candidate.personId);
    if (!person) return null;

    const evidenceDocs = await ctx.db
      .query("candidateEvidence")
      .withIndex("by_candidateId", (q) => q.eq("candidateId", candidate._id))
      .take(200);

    const evidence = [...evidenceDocs]
      .sort((a, b) => b.strength - a.strength)
      .map((evidenceDoc) => ({
        evidenceId: evidenceDoc._id,
        title: evidenceDoc.title,
        kind: evidenceDoc.kind,
        snippet: evidenceDoc.snippet,
        url: evidenceDoc.url,
        tags: evidenceDoc.tags,
        strength: evidenceDoc.strength,
        recencyYears: evidenceDoc.recencyYears,
        relevanceDisplay: evidenceDoc.relevanceDisplay,
      }));

    const avatarDisplayUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(candidate.slug)}`;

    return {
      scoreId: score._id,
      candidateId: candidate._id,
      rank: score.rank,
      finalScore: score.finalScore,
      baseScore: score.baseScore,
      confidence: score.confidence,
      summaryWhy: score.summaryWhy,
      topStrengths: score.topStrengths,
      risksOrGaps: score.risksOrGaps,
      factorBreakdown: score.factorBreakdown,
      networkConnections: candidate.networkConnections ?? [],
      candidate: {
        slug: candidate.slug,
        fullName: person.fullName,
        headline: person.headline ?? "",
        summary: person.summary ?? "",
        currentCompany: person.currentCompany,
        location: person.location,
        profileUrl: person.linkedinUrl,
        email: person.email,
        warmIntroPath: candidate.warmIntroPath,
        yearsExperience: person.yearsExperience ?? 0,
        seniority: candidate.seniority,
        stacks: person.stacks,
        domains: person.domains,
        avatarDisplayUrl,
        companyLogoUrl: person.companyLogoUrl,
        socialGithub: person.socialGithub,
        socialBlog: person.socialBlog,
        socialTwitter: person.socialTwitter,
        age: candidate.age,
      },
      evidence,
    };
  },
});
