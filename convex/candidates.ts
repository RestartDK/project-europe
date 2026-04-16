import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalAction, internalMutation, internalQuery } from "./_generated/server"
import { rankingAgent } from "./agents"

const connectionChannelValidator = v.union(
  v.literal("github"),
  v.literal("twitter"),
  v.literal("slack"),
  v.literal("conference"),
  v.literal("company"),
  v.literal("university"),
  v.literal("oss")
)

const networkConnectionValidator = v.object({
  id: v.string(),
  name: v.string(),
  avatar: v.string(),
  role: v.string(),
  channels: v.array(v.object({ type: connectionChannelValidator, detail: v.string() })),
  strength: v.union(v.literal("strong"), v.literal("medium"), v.literal("weak")),
  lastInteraction: v.string(),
  sharedProjects: v.number(),
  relationship: v.string(),
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId)
    if (!candidate) return null

    const person = await ctx.db.get(candidate.personId)
    if (!person) return null

    const { candidateId: _cId, ...fields } = args
    void _cId
    const patch: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val
    }

    if (Object.keys(patch).length > 0) {
      patch.clayEnriched = true
      patch.enrichmentStatus = "complete"
      patch.enrichmentCompletedAt = Date.now()
      await ctx.db.patch(person._id, patch)
    }

    await ctx.scheduler.runAfter(0, internal.candidates.generateOutreachEmail, {
      candidateId: args.candidateId,
    })
    await ctx.scheduler.runAfter(0, internal.candidates.generateNetworkConnections, {
      candidateId: args.candidateId,
    })

    return null
  },
})

export const getDataForOutreach = internalQuery({
  args: { candidateId: v.id("candidates") },
  returns: v.union(
    v.object({
      fullName: v.string(),
      headline: v.optional(v.string()),
      summary: v.optional(v.string()),
      currentCompany: v.optional(v.string()),
      location: v.optional(v.string()),
      stacks: v.array(v.string()),
      yearsExperience: v.optional(v.number()),
      socialGithub: v.optional(v.string()),
      rawPrompt: v.string(),
      companyContext: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId)
    if (!candidate) return null

    const person = await ctx.db.get(candidate.personId)
    if (!person) return null

    const request = await ctx.db.get(candidate.requestId)
    if (!request) return null

    return {
      fullName: person.fullName,
      headline: person.headline,
      summary: person.summary,
      currentCompany: person.currentCompany,
      location: person.location,
      stacks: person.stacks,
      yearsExperience: person.yearsExperience,
      socialGithub: person.socialGithub,
      rawPrompt: request.rawPrompt,
      companyContext: request.companyContext,
    }
  },
})

export const saveOutreachEmail = internalMutation({
  args: {
    candidateId: v.id("candidates"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, { outreachEmail: args.email })
    return null
  },
})

export const generateOutreachEmail = internalAction({
  args: { candidateId: v.id("candidates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data: {
      fullName: string
      headline?: string
      summary?: string
      currentCompany?: string
      location?: string
      stacks: string[]
      yearsExperience?: number
      socialGithub?: string
      rawPrompt: string
      companyContext?: string
    } | null = await ctx.runQuery(internal.candidates.getDataForOutreach, {
      candidateId: args.candidateId,
    })

    if (!data) return null

    const stacksLine =
      data.stacks.length > 0 ? `Tech stack: ${data.stacks.join(", ")}` : ""
    const githubLine = data.socialGithub ? `GitHub: ${data.socialGithub}` : ""
    const companyLine = data.currentCompany
      ? `Currently at: ${data.currentCompany}`
      : ""
    const locationLine = data.location ? `Based in: ${data.location}` : ""
    const experienceLine =
      data.yearsExperience != null
        ? `Years of experience: ${data.yearsExperience}`
        : ""
    const summaryLine = data.summary ? `Bio: ${data.summary}` : ""
    const headlineLine = data.headline ? `Headline: ${data.headline}` : ""
    const companyContextLine = data.companyContext
      ? `About us: ${data.companyContext}`
      : ""

    const prompt = `You are writing a short, direct outreach email to a software engineering candidate on behalf of a recruiter or founder.

Role context:
${data.rawPrompt}
${companyContextLine}

Candidate:
Name: ${data.fullName}
${headlineLine}
${companyLine}
${locationLine}
${experienceLine}
${stacksLine}
${summaryLine}
${githubLine}

Write a personalised cold outreach email. Rules:
- Maximum 100 words in the body
- Direct tone, no fluff
- Reference at least one specific detail from the candidate's profile
- Do NOT start with "I hope this email finds you well" or any similar opener
- End with "[Your name]" as the sign-off
- Return only the email text, no subject line, no extra commentary`

    const { threadId } = await rankingAgent.createThread(ctx, {})
    const result = await rankingAgent.generateText(ctx, { threadId }, { prompt })

    await ctx.runMutation(internal.candidates.saveOutreachEmail, {
      candidateId: args.candidateId,
      email: result.text,
    })

    return null
  },
})

export const getCandidatePersonForNetwork = internalQuery({
  args: { candidateId: v.id("candidates") },
  returns: v.union(
    v.object({
      personId: v.id("people"),
      location: v.optional(v.string()),
      stacks: v.array(v.string()),
      currentCompany: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId)
    if (!candidate) return null
    const person = await ctx.db.get(candidate.personId)
    if (!person) return null
    return {
      personId: person._id,
      location: person.location,
      stacks: person.stacks,
      currentCompany: person.currentCompany,
    }
  },
})

export const getPeoplePool = internalQuery({
  args: { excludePersonId: v.id("people") },
  returns: v.array(
    v.object({
      _id: v.id("people"),
      fullName: v.string(),
      headline: v.optional(v.string()),
      currentCompany: v.optional(v.string()),
      location: v.optional(v.string()),
      stacks: v.array(v.string()),
      socialGithub: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const people = await ctx.db.query("people").take(50)
    return people
      .filter((p) => p._id !== args.excludePersonId)
      .map((p) => ({
        _id: p._id,
        fullName: p.fullName,
        headline: p.headline,
        currentCompany: p.currentCompany,
        location: p.location,
        stacks: p.stacks,
        socialGithub: p.socialGithub,
      }))
  },
})

export const saveNetworkConnections = internalMutation({
  args: {
    candidateId: v.id("candidates"),
    connections: v.array(networkConnectionValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, { networkConnections: args.connections })
    return null
  },
})

export const generateNetworkConnections = internalAction({
  args: { candidateId: v.id("candidates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    type CandidatePersonData = {
      personId: Id<"people">
      location?: string
      stacks: string[]
      currentCompany?: string
    }
    type PoolPerson = {
      _id: Id<"people">
      fullName: string
      headline?: string
      currentCompany?: string
      location?: string
      stacks: string[]
      socialGithub?: string
    }

    const candidateData: CandidatePersonData | null = await ctx.runQuery(
      internal.candidates.getCandidatePersonForNetwork,
      { candidateId: args.candidateId }
    )
    if (!candidateData) return null

    const pool: PoolPerson[] = await ctx.runQuery(internal.candidates.getPeoplePool, {
      excludePersonId: candidateData.personId,
    })

    if (pool.length === 0) return null

    const candidateLoc = (candidateData.location ?? "").toLowerCase()
    const candidateStacks = new Set(candidateData.stacks.map((s) => s.toLowerCase()))
    const candidateCompany = (candidateData.currentCompany ?? "").toLowerCase()

    const scored = pool.map((p) => {
      let score = 0
      if (candidateLoc && p.location && p.location.toLowerCase().includes(candidateLoc)) score += 2
      if (candidateLoc && p.location && candidateLoc.includes(p.location.toLowerCase())) score += 2
      if (candidateCompany && p.currentCompany && p.currentCompany.toLowerCase() === candidateCompany) score += 1
      const sharedStacks = p.stacks.filter((s) => candidateStacks.has(s.toLowerCase())).length
      score += Math.min(sharedStacks, 3)
      return { person: p, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, 3)

    const interactionOptions = ["2 months ago", "last quarter", "6 months ago", "last year"]

    const connections = top.map(({ person, score }, i) => {
      const channels: { type: "github" | "twitter" | "slack" | "conference" | "company" | "university" | "oss"; detail: string }[] = []
      if (person.socialGithub) {
        channels.push({ type: "github", detail: "open source collaboration" })
      }
      channels.push({
        type: "company",
        detail: person.currentCompany ?? "industry network",
      })

      const strength: "strong" | "medium" | "weak" =
        score >= 3 ? "strong" : score >= 1 ? "medium" : "weak"
      const relationship =
        score >= 3 ? "former colleague" : score >= 1 ? "mutual connection" : "industry contact"

      return {
        id: person._id,
        name: person.fullName,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(person.fullName)}`,
        role: person.headline ?? "Software Engineer",
        channels,
        strength,
        lastInteraction: interactionOptions[i % interactionOptions.length]!,
        sharedProjects: Math.max(1, Math.min(score, 3)),
        relationship,
      }
    })

    await ctx.runMutation(internal.candidates.saveNetworkConnections, {
      candidateId: args.candidateId,
      connections,
    })

    return null
  },
})
