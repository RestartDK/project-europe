import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

export const createSearch = internalMutation({
  args: {
    query: v.string(),
    apolloParams: v.object({
      titles: v.array(v.string()),
      locations: v.array(v.string()),
      keywords: v.string(),
      skills: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("searches", {
      query: args.query,
      apolloParams: args.apolloParams,
      status: "searching",
      candidateCount: 0,
      createdAt: Date.now(),
    })
  },
})

export const updateSearchStatus = internalMutation({
  args: {
    searchId: v.id("searches"),
    status: v.union(
      v.literal("searching"),
      v.literal("enriching"),
      v.literal("complete"),
      v.literal("error"),
    ),
    candidateCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status }
    if (args.candidateCount !== undefined) {
      patch.candidateCount = args.candidateCount
    }
    await ctx.db.patch(args.searchId, patch)
  },
})

export const getSearch = query({
  args: { searchId: v.id("searches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.searchId)
  },
})

export const listSearches = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("searches").order("desc").take(20)
  },
})
