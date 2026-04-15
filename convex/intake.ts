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
      status: "ready_for_clay",
      promptVersion: args.promptVersion,
    });
  },
});

export const enqueueClayStub = internalAction({
  args: { requestId: v.id("searchRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.clay.enqueueStub, { requestId: args.requestId });
    return null;
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

    await ctx.runAction(internal.intake.enqueueClayStub, { requestId });

    console.log("[intake] search request saved, enqueueing Clay stub pipeline", {
      requestId,
      threadId,
      criteriaSource,
      roleTitle: criteria.roleTitle,
      stackCount: criteria.stack.length,
    });

    return { requestId, criteriaJson, threadId };
  },
});

