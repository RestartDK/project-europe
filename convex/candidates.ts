import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction, internalMutation, internalQuery } from "./_generated/server"
import { rankingAgent } from "./agents"

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
