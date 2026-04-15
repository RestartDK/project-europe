import { z } from "zod/v3";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { rankingAgent } from "./agents";
import { candidateStubs } from "./lib/candidateStubs";
import {
  defaultRankingModel,
  parseCriteria,
  promptVersion,
  rankCandidatesDeterministically,
  rankingVersion,
  type CandidateStub,
  type RankedCandidateResult,
  type SearchCriteria,
} from "./lib/ranking";
import { v } from "convex/values";

const factorBreakdownValidator = v.object({
  roleFit: v.number(),
  stackFit: v.number(),
  domainFit: v.number(),
  evidenceStrength: v.number(),
  recency: v.number(),
  signalConfidence: v.number(),
  reachabilityBonus: v.number(),
});

const evidenceValidator = v.object({
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
});

const candidateBundleValidator = v.array(
  v.object({
    candidateId: v.id("candidates"),
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
    evidence: v.array(evidenceValidator),
  }),
);

const rankingResultValidator = v.object({
  slug: v.string(),
  baseScore: v.number(),
  finalScore: v.number(),
  confidence: v.number(),
  summaryWhy: v.string(),
  topStrengths: v.array(v.string()),
  risksOrGaps: v.array(v.string()),
  evidenceRefs: v.array(
    v.object({
      evidenceId: v.string(),
      title: v.string(),
      snippet: v.string(),
      url: v.optional(v.string()),
    }),
  ),
  factorBreakdown: factorBreakdownValidator,
});

type CandidateBundle = {
  candidateId: Id<"candidates">;
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
  evidence: CandidateStub["evidence"];
};

type RequestContext = {
  request: Doc<"searchRequests">;
  criteriaJson: string;
};

const llmRankingSchema = z.object({
  notes: z.string().optional(),
  results: z.array(
    z.object({
      slug: z.string(),
      finalScore: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      summaryWhy: z.string(),
      topStrengths: z.array(z.string()).max(3),
      risksOrGaps: z.array(z.string()).max(3),
      evidenceRefs: z.array(z.string()).max(3),
      factorBreakdown: z.object({
        roleFit: z.number().min(0).max(100),
        stackFit: z.number().min(0).max(100),
        domainFit: z.number().min(0).max(100),
        evidenceStrength: z.number().min(0).max(100),
        recency: z.number().min(0).max(100),
        signalConfidence: z.number().min(0).max(100),
        reachabilityBonus: z.number().min(0).max(100),
      }),
    }),
  ),
});

export const setSearchRequestStatus = internalMutation({
  args: {
    requestId: v.id("searchRequests"),
    status: v.union(
      v.literal("ready_for_clay"),
      v.literal("clay_queued"),
      v.literal("importing_candidates"),
      v.literal("ranking"),
      v.literal("ranked"),
      v.literal("error"),
    ),
    latestRankingRunId: v.optional(v.id("rankingRuns")),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: args.status,
      latestRankingRunId: args.latestRankingRunId,
      errorMessage: args.errorMessage,
      rankingVersion:
        args.status === "ranking" || args.status === "ranked" ? rankingVersion : undefined,
    });
    return null;
  },
});

export const seedStubCandidates = internalMutation({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({ candidateCount: v.number() }),
  handler: async (ctx, args) => {
    for (const candidate of candidateStubs) {
      const candidateId = await ctx.db.insert("candidates", {
        requestId: args.requestId,
        slug: candidate.slug,
        fullName: candidate.fullName,
        headline: candidate.headline,
        summary: candidate.summary,
        location: candidate.location,
        currentCompany: candidate.currentCompany,
        profileUrl: candidate.profileUrl,
        email: candidate.email,
        warmIntroPath: candidate.warmIntroPath,
        yearsExperience: candidate.yearsExperience,
        seniority: candidate.seniority,
        stacks: candidate.stacks,
        domains: candidate.domains,
        roleKeywords: candidate.roleKeywords,
        signalConfidence: candidate.signalConfidence,
        reachabilityScore: candidate.reachabilityScore,
      });

      for (const evidence of candidate.evidence) {
        await ctx.db.insert("candidateEvidence", {
          requestId: args.requestId,
          candidateId,
          evidenceId: evidence.evidenceId,
          kind: evidence.kind,
          title: evidence.title,
          snippet: evidence.snippet,
          url: evidence.url,
          strength: evidence.strength,
          recencyYears: evidence.recencyYears,
          tags: evidence.tags,
        });
      }
    }

    console.log("[ranking] stub fixture inserted into DB", {
      requestId: args.requestId,
      candidateCount: candidateStubs.length,
      slugs: candidateStubs.map((c) => c.slug),
    });

    return { candidateCount: candidateStubs.length };
  },
});

export const getRequestContext = internalQuery({
  args: { requestId: v.id("searchRequests") },
  returns: v.union(
    v.object({
      request: v.object({
        _id: v.id("searchRequests"),
        _creationTime: v.number(),
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
      }),
      criteriaJson: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    return {
      request,
      criteriaJson: request.criteriaJson,
    };
  },
});

export const getCandidateBundle = internalQuery({
  args: { requestId: v.id("searchRequests") },
  returns: candidateBundleValidator,
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .take(50);

    const bundles: CandidateBundle[] = [];

    for (const candidate of candidates) {
      const evidence = await ctx.db
        .query("candidateEvidence")
        .withIndex("by_requestId_and_candidateId", (q) =>
          q.eq("requestId", args.requestId).eq("candidateId", candidate._id),
        )
        .take(10);

      bundles.push({
        candidateId: candidate._id,
        slug: candidate.slug,
        fullName: candidate.fullName,
        headline: candidate.headline,
        summary: candidate.summary,
        location: candidate.location,
        currentCompany: candidate.currentCompany,
        profileUrl: candidate.profileUrl,
        email: candidate.email,
        warmIntroPath: candidate.warmIntroPath,
        yearsExperience: candidate.yearsExperience,
        seniority: candidate.seniority,
        stacks: candidate.stacks,
        domains: candidate.domains,
        roleKeywords: candidate.roleKeywords,
        signalConfidence: candidate.signalConfidence,
        reachabilityScore: candidate.reachabilityScore,
        evidence: evidence.map((item) => ({
          evidenceId: item.evidenceId,
          kind: item.kind,
          title: item.title,
          snippet: item.snippet,
          url: item.url,
          strength: item.strength,
          recencyYears: item.recencyYears,
          tags: item.tags,
        })),
      });
    }

    return bundles;
  },
});

export const createRankingRun = internalMutation({
  args: {
    requestId: v.id("searchRequests"),
    threadId: v.string(),
    modelId: v.string(),
    candidateCount: v.number(),
  },
  returns: v.id("rankingRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("rankingRuns", {
      requestId: args.requestId,
      threadId: args.threadId,
      status: "running",
      rankingVersion,
      promptVersion,
      modelId: args.modelId,
      candidateCount: args.candidateCount,
      startedAt: Date.now(),
    });
  },
});

export const finalizeRankingRun = internalMutation({
  args: {
    rankingRunId: v.id("rankingRuns"),
    status: v.union(
      v.literal("completed"),
      v.literal("fallback"),
      v.literal("error"),
    ),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.rankingRunId, {
      status: args.status,
      completedAt: Date.now(),
      notes: args.notes,
    });
    return null;
  },
});

export const saveRankingResults = internalMutation({
  args: {
    requestId: v.id("searchRequests"),
    rankingRunId: v.id("rankingRuns"),
    results: v.array(rankingResultValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let index = 0; index < args.results.length; index += 1) {
      const result = args.results[index];
      const candidate = await ctx.db
        .query("candidates")
        .withIndex("by_requestId_and_slug", (q) =>
          q.eq("requestId", args.requestId).eq("slug", result.slug),
        )
        .unique();

      if (!candidate) {
        continue;
      }

      const evidenceDocs = await ctx.db
        .query("candidateEvidence")
        .withIndex("by_requestId_and_candidateId", (q) =>
          q.eq("requestId", args.requestId).eq("candidateId", candidate._id),
        )
        .take(10);

      const evidenceIds = result.evidenceRefs
        .map((ref) => evidenceDocs.find((doc) => doc.evidenceId === ref.evidenceId)?._id)
        .filter((value): value is Id<"candidateEvidence"> => Boolean(value));

      await ctx.db.insert("candidateScores", {
        requestId: args.requestId,
        rankingRunId: args.rankingRunId,
        candidateId: candidate._id,
        rank: index + 1,
        baseScore: result.baseScore,
        finalScore: result.finalScore,
        confidence: result.confidence,
        summaryWhy: result.summaryWhy,
        topStrengths: result.topStrengths,
        risksOrGaps: result.risksOrGaps,
        evidenceRefIds: evidenceIds,
        factorBreakdown: result.factorBreakdown,
      });
    }

    return null;
  },
});

function toCandidateStub(bundle: CandidateBundle): CandidateStub {
  return {
    slug: bundle.slug,
    fullName: bundle.fullName,
    headline: bundle.headline,
    summary: bundle.summary,
    location: bundle.location,
    currentCompany: bundle.currentCompany,
    profileUrl: bundle.profileUrl,
    email: bundle.email,
    warmIntroPath: bundle.warmIntroPath,
    yearsExperience: bundle.yearsExperience,
    seniority: bundle.seniority,
    stacks: bundle.stacks,
    domains: bundle.domains,
    roleKeywords: bundle.roleKeywords,
    signalConfidence: bundle.signalConfidence,
    reachabilityScore: bundle.reachabilityScore,
    evidence: bundle.evidence,
  };
}

function buildRankingPrompt(
  request: Doc<"searchRequests">,
  criteria: SearchCriteria,
  deterministicRanking: RankedCandidateResult[],
  candidates: CandidateBundle[],
) {
  const candidatePayload = candidates.map((candidate) => ({
    slug: candidate.slug,
    fullName: candidate.fullName,
    headline: candidate.headline,
    summary: candidate.summary,
    seniority: candidate.seniority,
    stacks: candidate.stacks,
    domains: candidate.domains,
    warmIntroPath: candidate.warmIntroPath,
    evidence: candidate.evidence.map((item) => ({
      evidenceId: item.evidenceId,
      kind: item.kind,
      title: item.title,
      snippet: item.snippet,
      tags: item.tags,
      strength: item.strength,
      recencyYears: item.recencyYears,
    })),
    deterministicBaseline: deterministicRanking.find((entry) => entry.slug === candidate.slug),
  }));

  return [
    "Rank these candidates for the search using only the provided evidence.",
    "Return every candidate exactly once.",
    "Use the deterministic baseline as an input, but feel free to rerank when the evidence supports it.",
    "Never cite evidence IDs that are not present in the candidate payload.",
    "",
    `Raw prompt:\n${request.rawPrompt}`,
    request.companyContext ? `Company context:\n${request.companyContext}` : null,
    `Structured criteria:\n${JSON.stringify(criteria, null, 2)}`,
    `Candidates:\n${JSON.stringify(candidatePayload, null, 2)}`,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

function mergeLlmResults(
  deterministicRanking: RankedCandidateResult[],
  llmResults: z.infer<typeof llmRankingSchema>["results"],
) {
  const baselineBySlug = new Map(deterministicRanking.map((result) => [result.slug, result]));

  return llmResults
    .map((result) => {
      const baseline = baselineBySlug.get(result.slug);
      if (!baseline) {
        return null;
      }

      return {
        ...baseline,
        finalScore: result.finalScore,
        confidence: result.confidence,
        summaryWhy: result.summaryWhy,
        topStrengths: result.topStrengths,
        risksOrGaps: result.risksOrGaps,
        evidenceRefs: baseline.evidenceRefs.filter((ref) =>
          result.evidenceRefs.includes(ref.evidenceId),
        ),
        factorBreakdown: result.factorBreakdown,
      } satisfies RankedCandidateResult;
    })
    .filter((value): value is RankedCandidateResult => Boolean(value))
    .sort((left, right) => right.finalScore - left.finalScore);
}

export const runRanking = internalAction({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({
    rankingRunId: v.id("rankingRuns"),
    status: v.union(
      v.literal("completed"),
      v.literal("fallback"),
      v.literal("error"),
    ),
  }),
  handler: async (ctx, args) => {
    const requestContext: RequestContext | null = await ctx.runQuery(
      internal.rankingActions.getRequestContext,
      { requestId: args.requestId },
    );

    if (!requestContext) {
      throw new Error("Search request not found");
    }

    const criteria = parseCriteria(requestContext.request.criteriaJson);
    if (!criteria) {
      throw new Error("Search criteria could not be parsed");
    }

    const candidates: CandidateBundle[] = await ctx.runQuery(
      internal.rankingActions.getCandidateBundle,
      { requestId: args.requestId },
    );

    console.log("[ranking] runRanking start", {
      requestId: args.requestId,
      roleTitle: criteria.roleTitle,
      domain: criteria.domain,
      candidateCount: candidates.length,
      rawPromptPreview: requestContext.request.rawPrompt.slice(0, 200),
    });

    const { threadId } = await rankingAgent.createThread(ctx, {});
    const rankingRunId: Id<"rankingRuns"> = await ctx.runMutation(
      internal.rankingActions.createRankingRun,
      {
        requestId: args.requestId,
        threadId,
        modelId: defaultRankingModel,
        candidateCount: candidates.length,
      },
    );

    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "ranking",
      latestRankingRunId: rankingRunId,
    });

    const deterministicRanking = rankCandidatesDeterministically(
      criteria,
      candidates.map(toCandidateStub),
    );

    console.log("[ranking] deterministic baseline order", {
      requestId: args.requestId,
      rankingRunId,
      order: deterministicRanking.slice(0, 6).map((r, i) => ({
        rank: i + 1,
        slug: r.slug,
        baseScore: Math.round(r.baseScore * 100) / 100,
      })),
    });

    let persistedResults = deterministicRanking;
    let rankingStatus: "completed" | "fallback" | "error" = "fallback";
    let notes = "Used deterministic fallback ranking.";

    try {
      const llmResult = await rankingAgent.generateObject(ctx, { threadId }, {
        prompt: buildRankingPrompt(
          requestContext.request,
          criteria,
          deterministicRanking,
          candidates,
        ),
        schema: llmRankingSchema,
      });

      const mergedResults = mergeLlmResults(deterministicRanking, llmResult.object.results);
      if (mergedResults.length === deterministicRanking.length) {
        persistedResults = mergedResults;
        rankingStatus = "completed";
        notes = llmResult.object.notes ?? "Ranked with Convex Agent and Anthropic.";
      } else {
        notes = "LLM output was incomplete, so deterministic fallback was used.";
      }
      console.log("[ranking] Convex Agent rerank result", {
        requestId: args.requestId,
        rankingRunId,
        rankingStatus,
        notesPreview: notes.slice(0, 300),
        mergedCount: mergedResults.length,
        expectedCount: deterministicRanking.length,
      });
    } catch (error) {
      notes =
        error instanceof Error
          ? `Fallback ranking used because Anthropic rerank failed: ${error.message}`
          : "Fallback ranking used because Anthropic rerank failed.";
      console.log("[ranking] Convex Agent rerank threw; using deterministic fallback", {
        requestId: args.requestId,
        rankingRunId,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    await ctx.runMutation(internal.rankingActions.saveRankingResults, {
      requestId: args.requestId,
      rankingRunId,
      results: persistedResults,
    });

    await ctx.runMutation(internal.rankingActions.finalizeRankingRun, {
      rankingRunId,
      status: rankingStatus,
      notes,
    });

    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "ranked",
      latestRankingRunId: rankingRunId,
    });

    console.log("[ranking] runRanking return", {
      requestId: args.requestId,
      rankingRunId,
      rankingStatus,
      persistedCount: persistedResults.length,
      finalOrder: persistedResults.map((r, i) => ({
        rank: i + 1,
        slug: r.slug,
        finalScore: Math.round(r.finalScore * 100) / 100,
      })),
    });

    return {
      rankingRunId,
      status: rankingStatus,
    };
  },
});
