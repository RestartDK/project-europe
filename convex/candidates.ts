import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

export const createCandidate = internalMutation({
  args: {
    searchId: v.id("searches"),
    name: v.string(),
    currentTitle: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    pdlId: v.optional(v.string()),
    pdlScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("talentCandidates", {
      searchId: args.searchId,
      name: args.name,
      currentTitle: args.currentTitle,
      currentCompany: args.currentCompany,
      linkedinUrl: args.linkedinUrl,
      location: args.location,
      pdlId: args.pdlId,
      pdlScore: args.pdlScore,
      enriched: false,
    })
  },
})

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
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId)
    if (!candidate) return null

    const { candidateId, ...fields } = args
    const patch: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(candidateId, patch)
    }
    return null
  },
})

export const getCandidatesForSearch = query({
  args: { searchId: v.id("searches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("talentCandidates")
      .withIndex("by_searchId", (q) => q.eq("searchId", args.searchId))
      .take(50)
  },
})
