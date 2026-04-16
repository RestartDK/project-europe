import { v } from "convex/values"
import { internalMutation, internalQuery, query } from "./_generated/server"

const personValidator = v.object({
  name: v.string(),
  linkedinUrl: v.optional(v.string()),
  currentTitle: v.optional(v.string()),
  currentCompany: v.optional(v.string()),
  location: v.optional(v.string()),
  skills: v.optional(v.array(v.string())),
  jobTitleLevels: v.optional(v.array(v.string())),
  jobTitleSubRole: v.optional(v.string()),
  jobTitleRole: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
})

export const insertBatch = internalMutation({
  args: { people: v.array(personValidator) },
  handler: async (ctx, args) => {
    const now = Date.now()
    for (const person of args.people) {
      await ctx.db.insert("candidatePool", { ...person, importedAt: now })
    }
    return args.people.length
  },
})

export const clearPool = internalMutation({
  args: {},
  handler: async (ctx) => {
    const batch = await ctx.db.query("candidatePool").take(1000)
    for (const doc of batch) {
      await ctx.db.delete(doc._id)
    }
    return batch.length
  },
})

export const getPoolStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("candidatePool").take(1001)
    return { count: all.length }
  },
})

export const getAllForScoring = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("candidatePool").take(1000)
  },
})
