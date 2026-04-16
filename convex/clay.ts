import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getCandidatesWithPeople = internalQuery({
  args: { requestId: v.optional(v.id("searchRequests")) },
  returns: v.array(
    v.object({
      candidateId: v.id("candidates"),
      linkedinUrl: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const candidates = args.requestId
      ? await ctx.db
          .query("candidates")
          .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId!))
          .take(500)
      : await ctx.db.query("candidates").take(500);

    const results: { candidateId: Id<"candidates">; linkedinUrl: string }[] = [];

    for (const c of candidates) {
      const person = await ctx.db.get(c.personId);
      if (!person) continue;
      results.push({
        candidateId: c._id,
        linkedinUrl: person.linkedinUrl,
      });
    }

    return results;
  },
});

export const pushCandidatesToClay = internalAction({
  args: {
    requestId: v.optional(v.id("searchRequests")),
  },
  returns: v.object({ sent: v.number() }),
  handler: async (ctx, args) => {
    const webhookUrl = process.env.CLAY_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("CLAY_WEBHOOK_URL environment variable is not set");
    }

    const candidates = await ctx.runQuery(internal.clay.getCandidatesWithPeople, {
      requestId: args.requestId,
    });

    if (candidates.length === 0) {
      console.log("[clay:push] no candidates found");
      return { sent: 0 };
    }

    let sent = 0;
    const errors: string[] = [];

    for (const c of candidates) {
      const row = {
        convex_candidate_id: c.candidateId,
        linkedin_url: c.linkedinUrl,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });

      if (response.ok) {
        sent++;
      } else {
        const body = await response.text();
        errors.push(`${c.candidateId}: ${response.status} — ${body}`);
        console.log("[clay:push] failed for candidate", {
          id: c.candidateId,
          status: response.status,
          body,
        });
      }
    }

    console.log("[clay:push] done", {
      sent,
      failed: errors.length,
      total: candidates.length,
      requestId: args.requestId ?? "all",
    });

    if (errors.length > 0 && sent === 0) {
      throw new Error(`All ${errors.length} requests failed. First: ${errors[0]}`);
    }

    return { sent };
  },
});

export const getSearchRequest = internalQuery({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({ criteriaJson: v.string() }),
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error(`searchRequest not found: ${args.requestId}`);
    return { criteriaJson: req.criteriaJson };
  },
});
