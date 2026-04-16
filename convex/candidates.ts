import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const updateFromClay = internalMutation({
  args: {
    candidateId: v.id("candidates"),
    email: v.optional(v.string()),
    socialGithub: v.optional(v.string()),
    socialTwitter: v.optional(v.string()),
    socialBlog: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    headline: v.optional(v.string()),
    summary: v.optional(v.string()),
    location: v.optional(v.string()),
    stacks: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) return null;

    const person = await ctx.db.get(candidate.personId);
    if (!person) return null;

    const { candidateId: _cId, ...fields } = args; void _cId;
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val;
    }

    if (Object.keys(patch).length > 0) {
      patch.clayEnriched = true;
      await ctx.db.patch(person._id, patch);
    }

    return null;
  },
});
