import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

export const createSearch = internalMutation({
  args: {
    query: v.string(),
    company: v.optional(v.string()),
    lookingFor: v.optional(v.string()),
    chips: v.optional(v.array(v.string())),
    pdlParams: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("searches", {
      query: args.query,
      company: args.company,
      lookingFor: args.lookingFor,
      chips: args.chips,
      pdlParams: args.pdlParams,
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
