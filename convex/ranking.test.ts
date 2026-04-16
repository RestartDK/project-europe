/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"

import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

const factorBreakdown = {
  roleFit: 80,
  stackFit: 75,
  domainFit: 70,
  evidenceStrength: 65,
  recency: 60,
  signalConfidence: 55,
  reachabilityBonus: 50,
}

describe("getSearchResults", () => {
  test("returns per-person enrichment states and counts", async () => {
    const t = convexTest(schema, modules)

    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("searchRequests", {
        threadId: "ranking-thread",
        rawPrompt: "find senior backend engineers",
        criteriaJson: "{}",
        status: "ranked",
        promptVersion: "v1",
      })
    })

    const rankingRunId = await t.run(async (ctx) => {
      return await ctx.db.insert("rankingRuns", {
        requestId,
        threadId: "ranking-thread",
        status: "completed",
        rankingVersion: "candidate-ranking-v1",
        promptVersion: "search-intake-v1",
        modelId: "test-model",
        candidateCount: 4,
        startedAt: Date.now(),
        completedAt: Date.now(),
      })
    })

    await t.run(async (ctx) => {
      await ctx.db.patch(requestId, {
        latestRankingRunId: rankingRunId,
      })
    })

    const people = await t.run(async (ctx) => {
      return {
        ready: await ctx.db.insert("people", {
          linkedinUrl: "https://linkedin.com/in/ready-person",
          fullName: "Ready Person",
          headline: "Staff Backend Engineer",
          summary: "Ships distributed systems.",
          stacks: ["TypeScript"],
          domains: ["backend"],
          clayEnriched: false,
        }),
        queued: await ctx.db.insert("people", {
          linkedinUrl: "https://linkedin.com/in/queued-person",
          fullName: "Queued Person",
          headline: "Senior Engineer",
          stacks: ["Go"],
          domains: ["backend"],
          clayEnriched: false,
        }),
        complete: await ctx.db.insert("people", {
          linkedinUrl: "https://linkedin.com/in/complete-person",
          fullName: "Complete Person",
          headline: "Principal Engineer",
          summary: "Has already been enriched.",
          stacks: ["Rust"],
          domains: ["infrastructure"],
          clayEnriched: true,
          enrichmentStatus: "complete",
        }),
        failed: await ctx.db.insert("people", {
          linkedinUrl: "https://linkedin.com/in/failed-person",
          fullName: "Failed Person",
          headline: "Platform Engineer",
          stacks: ["Python"],
          domains: ["platform"],
          clayEnriched: false,
          enrichmentStatus: "failed",
        }),
      }
    })

    const candidateEntries = [
      [people.ready, "ready-person"],
      [people.queued, "queued-person"],
      [people.complete, "complete-person"],
      [people.failed, "failed-person"],
    ] as const

    await t.run(async (ctx) => {
      for (let index = 0; index < candidateEntries.length; index += 1) {
        const [personId, slug] = candidateEntries[index]
        const candidateId = await ctx.db.insert("candidates", {
          requestId,
          personId,
          slug,
          seniority: "senior",
          roleKeywords: ["engineer"],
          signalConfidence: 0.7,
          reachabilityScore: 0.5,
        })

        await ctx.db.insert("candidateScores", {
          requestId,
          rankingRunId,
          candidateId,
          rank: index + 1,
          baseScore: 70 + index,
          finalScore: 80 + index,
          confidence: 0.8,
          summaryWhy: `reason ${index + 1}`,
          topStrengths: [],
          risksOrGaps: [],
          evidenceRefIds: [],
          factorBreakdown,
        })
      }
    })

    const results = await t.query(api.ranking.getSearchResults, { requestId })
    expect(results).not.toBeNull()
    expect(results?.enrichmentSummary).toEqual({
      ready: 1,
      queued: 1,
      complete: 1,
      failed: 1,
    })
    expect(results?.results.map((row) => row.enrichmentStatus)).toEqual([
      "ready",
      "queued",
      "complete",
      "failed",
    ])
  })
})
