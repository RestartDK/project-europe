import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  searches: defineTable({
    query: v.string(),
    apolloParams: v.object({
      titles: v.array(v.string()),
      locations: v.array(v.string()),
      keywords: v.string(),
      skills: v.array(v.string()),
    }),
    status: v.union(
      v.literal("searching"),
      v.literal("enriching"),
      v.literal("complete"),
      v.literal("error"),
    ),
    candidateCount: v.number(),
    createdAt: v.number(),
  }),

  candidates: defineTable({
    searchId: v.id("searches"),
    // From Apollo
    name: v.string(),
    currentTitle: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    apolloId: v.optional(v.string()),
    // Clay enrichment state
    enriched: v.boolean(),
    enrichedAt: v.optional(v.number()),
    // From Clay AI columns
    skills: v.optional(v.array(v.string())),
    accomplishmentSummary: v.optional(v.string()),
    movabilityScore: v.optional(v.number()),
    movabilityReason: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    rawClayData: v.optional(v.any()),
  })
    .index("by_searchId", ["searchId"])
    .index("by_linkedinUrl", ["linkedinUrl"]),
})
