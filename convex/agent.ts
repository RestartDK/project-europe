import { action } from "./_generated/server";
import { v } from "convex/values";
import { assistantAgent } from "./agents";

export const chat = action({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const { threadId } = await assistantAgent.createThread(ctx, {});
    const result = await assistantAgent.generateText(
      ctx,
      { threadId },
      { prompt: args.message },
    );
    return result.text;
  },
});
