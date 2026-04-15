import { z } from "zod";

import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation } from "./_generated/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

import { searchIntakeAgent } from "./agents";

const criteriaSchema = z.object({
  roleTitle: z.string().describe("Target role or title"),
  stack: z
    .array(z.string())
    .describe("Primary technologies: languages, frameworks, tools"),
  domain: z.string().describe("Domain or industry focus"),
  seniority: z
    .string()
    .optional()
    .describe("Seniority or level, if specified (e.g. senior, staff)"),
  mustHave: z
    .array(z.string())
    .describe("Hard requirements and non-negotiables"),
  niceToHave: z.array(z.string()).describe("Soft preferences"),
  evidenceSignals: z
    .array(z.string())
    .describe(
      "Evidence to prioritize: OSS, talks, blogs, performance work, distributed systems, etc.",
    ),
  sharpeningQuestions: z
    .array(z.string())
    .describe("2-3 follow-up questions to clarify the request"),
});

export const saveSearchRequest = internalMutation({
  args: {
    threadId: v.string(),
    rawPrompt: v.string(),
    companyContext: v.optional(v.string()),
    criteriaJson: v.string(),
  },
  returns: v.id("searchRequests"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("searchRequests", {
      threadId: args.threadId,
      rawPrompt: args.rawPrompt,
      companyContext: args.companyContext,
      criteriaJson: args.criteriaJson,
      status: "ready_for_clay",
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

    const result = await searchIntakeAgent.generateObject(
      ctx,
      { threadId },
      {
        system,
        prompt,
        schema: criteriaSchema,
      },
    );

    const criteria = result.object;
    const criteriaJson = JSON.stringify(criteria, null, 2);

    const requestId = await ctx.runMutation(internal.intake.saveSearchRequest, {
      threadId,
      rawPrompt: args.prompt,
      companyContext: args.companyContext,
      criteriaJson,
    });

    await ctx.runAction(internal.intake.enqueueClayStub, { requestId });

    return { requestId, criteriaJson, threadId };
  },
});

