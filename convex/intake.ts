import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation } from "./_generated/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

import { searchIntakeAgent } from "./agents";
import {
  extractCriteriaFallback,
  promptVersion,
  searchCriteriaSchema,
  type SearchCriteria,
} from "./lib/ranking";

export const saveSearchRequest = internalMutation({
  args: {
    threadId: v.string(),
    rawPrompt: v.string(),
    companyContext: v.optional(v.string()),
    criteriaJson: v.string(),
    promptVersion: v.string(),
  },
  returns: v.id("searchRequests"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("searchRequests", {
      threadId: args.threadId,
      rawPrompt: args.rawPrompt,
      companyContext: args.companyContext,
      criteriaJson: args.criteriaJson,
      status: "pending",
      promptVersion: args.promptVersion,
    });
  },
});

export const extractSearchCriteria = action({
  args: {
    prompt: v.string(),
    companyContext: v.optional(v.string()),
  },
  returns: v.object({
    requestId: v.id("searchRequests"),
    criteriaJson: v.string(),
    threadId: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    requestId: Id<"searchRequests">;
    criteriaJson: string;
    threadId: string;
  }> => {
    const { threadId } = await searchIntakeAgent.createThread(ctx, {});

    const system =
      "You are an intake assistant for developer outreach. Convert the user request into JSON for candidate discovery. If a field is unknown, use empty arrays (or omit optional fields). Do not guess.";
    const prompt = [
      args.companyContext ? `Company context:\n${args.companyContext}` : null,
      `User request:\n${args.prompt}`,
    ]
      .filter((x): x is string => Boolean(x))
      .join("\n\n");

    console.log("[intake] first prompt for validation", {
      threadId,
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 500),
      hasCompanyContext: Boolean(args.companyContext?.trim()),
    });

    let criteria: SearchCriteria = extractCriteriaFallback(
      args.prompt,
      args.companyContext,
    );
    let criteriaSource: "llm" | "fallback" = "fallback";

    try {
      const result = await searchIntakeAgent.generateObject(
        ctx,
        { threadId },
        {
          system,
          prompt,
          schema: searchCriteriaSchema,
        },
      );

      criteria = result.object;
      criteriaSource = "llm";
    } catch (error) {
      criteria = extractCriteriaFallback(args.prompt, args.companyContext);
      criteriaSource = "fallback";
      console.log("[intake] LLM criteria extraction failed, using fallback", {
        threadId,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const criteriaJson = JSON.stringify(criteria, null, 2);

    const requestId = await ctx.runMutation(internal.intake.saveSearchRequest, {
      threadId,
      rawPrompt: args.prompt,
      companyContext: args.companyContext,
      criteriaJson,
      promptVersion,
    });

    console.log("[intake] search request saved", {
      requestId,
      threadId,
      criteriaSource,
      roleTitle: criteria.roleTitle,
      stackCount: criteria.stack.length,
    });

    // Fire off the full pipeline: PDL search -> ranking -> Clay enrichment
    await ctx.runAction(internal.intake.runSearchPipeline, { requestId });

    return { requestId, criteriaJson, threadId };
  },
});

/**
 * Full pipeline: PDL search -> rank -> async Clay enrichment.
 */
export const runSearchPipeline = internalAction({
  args: { requestId: v.id("searchRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Step 1: PDL search
      const pdlResult = await ctx.runAction(internal.pdlSearch.runPdlSearch, {
        requestId: args.requestId,
      });

      console.log("[pipeline] PDL search complete", {
        requestId: args.requestId,
        ...pdlResult,
      });

      if (pdlResult.candidatesCreated === 0) {
        await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
          requestId: args.requestId,
          status: "error",
          errorMessage: "No candidates found from PDL search.",
        });
        return null;
      }

      // Step 2: Rank
      const rankResult = await ctx.runAction(internal.rankingActions.runRanking, {
        requestId: args.requestId,
      });

      console.log("[pipeline] ranking complete", {
        requestId: args.requestId,
        rankingStatus: rankResult.status,
        rankingRunId: rankResult.rankingRunId,
      });

      // Step 3: Push to Clay for async enrichment (best-effort)
      try {
        await ctx.runAction(internal.clay.pushCandidatesToClay, {
          requestId: args.requestId,
        });
        console.log("[pipeline] Clay push complete", { requestId: args.requestId });
      } catch (clayError) {
        console.log("[pipeline] Clay push failed (non-fatal)", {
          requestId: args.requestId,
          error: clayError instanceof Error ? clayError.message : String(clayError),
        });
      }
    } catch (error) {
      console.log("[pipeline] fatal error", {
        requestId: args.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
        requestId: args.requestId,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    return null;
  },
});
