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
    apolloId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("talentCandidates", {
      searchId: args.searchId,
      name: args.name,
      currentTitle: args.currentTitle,
      currentCompany: args.currentCompany,
      linkedinUrl: args.linkedinUrl,
      location: args.location,
      apolloId: args.apolloId,
      enriched: false,
    })
  },
})

export const updateFromClay = internalMutation({
  args: {
    candidateId: v.id("talentCandidates"),
    skills: v.optional(v.array(v.string())),
    accomplishmentSummary: v.optional(v.string()),
    movabilityScore: v.optional(v.number()),
    movabilityReason: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    rawClayData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId)
    if (!candidate) return null

    await ctx.db.patch(args.candidateId, {
      enriched: true,
      enrichedAt: Date.now(),
      skills: args.skills,
      accomplishmentSummary: args.accomplishmentSummary,
      movabilityScore: args.movabilityScore,
      movabilityReason: args.movabilityReason,
      githubUrl: args.githubUrl,
      rawClayData: args.rawClayData,
    })
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
