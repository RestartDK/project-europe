import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server"
import { v } from "convex/values"

import { getEffectiveEnrichmentStatus } from "./lib/enrichment"

const enrichmentStatusValidator = v.union(
  v.literal("ready"),
  v.literal("queued"),
  v.literal("complete"),
  v.literal("failed")
)

function normalizeLinkedinUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  return `https://${trimmed}`
}

export const getCandidatesWithPeople = internalQuery({
  args: { requestId: v.optional(v.id("searchRequests")) },
  returns: v.array(
    v.object({
      candidateId: v.id("candidates"),
      personId: v.id("people"),
      linkedinUrl: v.string(),
      enrichmentStatus: enrichmentStatusValidator,
    })
  ),
  handler: async (ctx, args) => {
    const candidates = args.requestId
      ? await ctx.db
          .query("candidates")
          .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId!))
          .take(500)
      : await ctx.db.query("candidates").take(500)

    const results: {
      candidateId: Id<"candidates">
      personId: Id<"people">
      linkedinUrl: string
      enrichmentStatus: "ready" | "queued" | "complete" | "failed"
    }[] = []

    for (const c of candidates) {
      const person = await ctx.db.get(c.personId)
      if (!person) continue
      results.push({
        candidateId: c._id,
        personId: person._id,
        linkedinUrl: person.linkedinUrl,
        enrichmentStatus: getEffectiveEnrichmentStatus(person),
      })
    }

    return results
  },
})

export const setPersonEnrichmentStatus = internalMutation({
  args: {
    personId: v.id("people"),
    status: enrichmentStatusValidator,
    requestedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: {
      enrichmentStatus: "ready" | "queued" | "complete" | "failed"
      enrichmentRequestedAt?: number
      enrichmentCompletedAt?: number
      enrichmentError?: string
    } = {
      enrichmentStatus: args.status,
    }

    if (args.requestedAt !== undefined) {
      patch.enrichmentRequestedAt = args.requestedAt
    }
    if (args.completedAt !== undefined) {
      patch.enrichmentCompletedAt = args.completedAt
    }
    if (args.errorMessage) {
      patch.enrichmentError = args.errorMessage
    }

    await ctx.db.patch(args.personId, patch)
    return null
  },
})

export const pushCandidatesToClay = internalAction({
  args: {
    requestId: v.optional(v.id("searchRequests")),
  },
  returns: v.object({ sent: v.number() }),
  handler: async (ctx, args) => {
    const webhookUrl = process.env.CLAY_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error("CLAY_WEBHOOK_URL environment variable is not set")
    }

    const candidates = await ctx.runQuery(
      internal.clay.getCandidatesWithPeople,
      {
        requestId: args.requestId,
      }
    )

    if (candidates.length === 0) {
      console.log("[clay:push] no candidates found")
      return { sent: 0 }
    }

    let sent = 0
    const errors: string[] = []

    for (const c of candidates) {
      if (c.enrichmentStatus !== "queued" && c.enrichmentStatus !== "failed") {
        continue
      }

      const linkedinUrl = normalizeLinkedinUrl(c.linkedinUrl)

      const queuedAt = Date.now()
      const queuedResult: null = await ctx.runMutation(
        internal.clay.setPersonEnrichmentStatus,
        {
          personId: c.personId,
          status: "queued",
          requestedAt: queuedAt,
        }
      )
      void queuedResult

      const row = {
        convex_candidate_id: c.candidateId,
        linkedin_url: linkedinUrl,
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      })

      if (response.ok) {
        const responseText = await response.text()
        const requestId = response.headers.get("request-id")
        sent++
        console.log("[clay:push] sent candidate", {
          candidateId: c.candidateId,
          personId: c.personId,
          status: response.status,
          linkedinUrl,
          clayRequestId: requestId,
          clayResponseBody: responseText,
        })
      } else {
        const body = await response.text()
        const failedResult: null = await ctx.runMutation(
          internal.clay.setPersonEnrichmentStatus,
          {
            personId: c.personId,
            status: "failed",
            errorMessage: `${response.status} — ${body}`,
          }
        )
        void failedResult
        errors.push(`${c.candidateId}: ${response.status} — ${body}`)
        console.log("[clay:push] failed for candidate", {
          id: c.candidateId,
          status: response.status,
          body,
        })
      }
    }

    console.log("[clay:push] done", {
      sent,
      failed: errors.length,
      total: candidates.length,
      requestId: args.requestId ?? "all",
    })

    if (errors.length > 0 && sent === 0) {
      throw new Error(
        `All ${errors.length} requests failed. First: ${errors[0]}`
      )
    }

    return { sent }
  },
})

export const getSearchRequest = internalQuery({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({ criteriaJson: v.string() }),
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId)
    if (!req) throw new Error(`searchRequest not found: ${args.requestId}`)
    return { criteriaJson: req.criteriaJson }
  },
})
