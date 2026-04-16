import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/* ── Push candidates to Clay webhook ────────────────────────────── */

export const getAllCandidates = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("candidates").take(500);
  },
});

export const getCandidatesByRequest = internalQuery({
  args: { requestId: v.id("searchRequests") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("candidates")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .take(500);
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

    const candidates: Doc<"candidates">[] = args.requestId
      ? await ctx.runQuery(internal.clay.getCandidatesByRequest, {
          requestId: args.requestId,
        })
      : await ctx.runQuery(internal.clay.getAllCandidates, {});

    if (candidates.length === 0) {
      console.log("[clay:push] no candidates found");
      return { sent: 0 };
    }

    let sent = 0;
    const errors: string[] = [];

    for (const c of candidates) {
      const row = {
        convex_candidate_id: c._id,
        linkedin_url: c.profileUrl ?? null,
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
        errors.push(`${c._id}: ${response.status} — ${body}`);
        console.log("[clay:push] failed for candidate", { id: c._id, status: response.status, body });
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
