import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import {
  normalise,
  buildQuery,
  scorePdlPerson,
  searchPdl,
  type PDLPerson,
  type PDLSearchSchema,
} from "./lib/pdl";
import { type SearchCriteria } from "./lib/ranking";

/* ── Mutations for upserting people + creating candidates ────────── */

export const upsertPerson = internalMutation({
  args: {
    linkedinUrl: v.string(),
    fullName: v.string(),
    headline: v.optional(v.string()),
    summary: v.optional(v.string()),
    location: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
    stacks: v.array(v.string()),
    domains: v.array(v.string()),
    yearsExperience: v.optional(v.number()),
    socialGithub: v.optional(v.string()),
    pdlId: v.optional(v.string()),
    pdlData: v.optional(v.any()),
  },
  returns: v.id("people"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("people")
      .withIndex("by_linkedinUrl", (q) => q.eq("linkedinUrl", args.linkedinUrl))
      .unique();

    if (existing) {
      const patch: Record<string, unknown> = {};
      if (args.fullName) patch.fullName = args.fullName;
      if (args.headline) patch.headline = args.headline;
      if (args.summary) patch.summary = args.summary;
      if (args.location) patch.location = args.location;
      if (args.currentCompany) patch.currentCompany = args.currentCompany;
      if (args.stacks.length > 0) patch.stacks = args.stacks;
      if (args.domains.length > 0) patch.domains = args.domains;
      if (args.yearsExperience !== undefined) patch.yearsExperience = args.yearsExperience;
      if (args.socialGithub) patch.socialGithub = args.socialGithub;
      if (args.pdlId) patch.pdlId = args.pdlId;
      if (args.pdlData) patch.pdlData = args.pdlData;
      if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("people", {
      linkedinUrl: args.linkedinUrl,
      fullName: args.fullName,
      headline: args.headline,
      summary: args.summary,
      location: args.location,
      currentCompany: args.currentCompany,
      stacks: args.stacks,
      domains: args.domains,
      yearsExperience: args.yearsExperience,
      socialGithub: args.socialGithub,
      pdlId: args.pdlId,
      pdlData: args.pdlData,
      clayEnriched: false,
    });
  },
});

export const createCandidateForRequest = internalMutation({
  args: {
    requestId: v.id("searchRequests"),
    personId: v.id("people"),
    slug: v.string(),
    seniority: v.string(),
    roleKeywords: v.array(v.string()),
    signalConfidence: v.number(),
    reachabilityScore: v.number(),
    pdlScore: v.optional(v.number()),
  },
  returns: v.id("candidates"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("candidates")
      .withIndex("by_requestId_and_slug", (q) =>
        q.eq("requestId", args.requestId).eq("slug", args.slug),
      )
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("candidates", {
      requestId: args.requestId,
      personId: args.personId,
      slug: args.slug,
      seniority: args.seniority,
      roleKeywords: args.roleKeywords,
      signalConfidence: args.signalConfidence,
      reachabilityScore: args.reachabilityScore,
      pdlScore: args.pdlScore,
    });
  },
});

export const getSearchRequestCriteria = internalQuery({
  args: { requestId: v.id("searchRequests") },
  returns: v.union(
    v.object({ criteriaJson: v.string(), rawPrompt: v.string(), companyContext: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req) return null;
    return { criteriaJson: req.criteriaJson, rawPrompt: req.rawPrompt, companyContext: req.companyContext };
  },
});

/* ── Helpers ─────────────────────────────────────────────────────── */

function slugFromLinkedin(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
  return match ? match[1] : url.replace(/[^a-z0-9]/gi, "-").slice(0, 40);
}

function inferSeniority(person: PDLPerson): string {
  const levels = person.job_title_levels ?? [];
  if (levels.includes("cxo") || levels.includes("vp")) return "executive";
  if (levels.includes("director")) return "director";
  if (levels.includes("manager")) return "manager";
  if (levels.includes("senior")) return "senior";
  if (levels.includes("entry") || levels.includes("training")) return "junior";
  if ((person.inferred_years_experience ?? 0) >= 8) return "senior";
  return "mid";
}

function inferDomains(person: PDLPerson): string[] {
  const domains: string[] = [];
  const title = (person.job_title ?? "").toLowerCase();
  const skills = (person.skills ?? []).map((s) => s.toLowerCase());
  const all = [title, ...skills].join(" ");

  if (all.includes("infra") || all.includes("platform") || all.includes("devops")) domains.push("infrastructure");
  if (all.includes("data") || all.includes("machine learning") || all.includes("ml")) domains.push("data");
  if (all.includes("security") || all.includes("crypto")) domains.push("security");
  if (all.includes("mobile") || all.includes("ios") || all.includes("android")) domains.push("mobile");
  if (all.includes("frontend") || all.includes("react") || all.includes("ui")) domains.push("frontend");
  if (all.includes("backend") || all.includes("api") || all.includes("server")) domains.push("backend");
  if (all.includes("full stack") || all.includes("fullstack")) domains.push("fullstack");
  if (domains.length === 0) domains.push("engineering");

  return domains;
}

function roleKeywordsFromPdl(person: PDLPerson): string[] {
  const kw: string[] = [];
  if (person.job_title_role) kw.push(person.job_title_role);
  if (person.job_title_sub_role) kw.push(person.job_title_sub_role);
  if (person.job_title) kw.push(...person.job_title.toLowerCase().split(/\s+/).slice(0, 4));
  return [...new Set(kw)];
}

/* ── Main PDL search action ──────────────────────────────────────── */

export const runPdlSearch = internalAction({
  args: {
    requestId: v.id("searchRequests"),
  },
  returns: v.object({
    peopleUpserted: v.number(),
    candidatesCreated: v.number(),
    pdlTotal: v.number(),
  }),
  handler: async (ctx, args) => {
    const pdlApiKey = process.env.PDL_API_KEY;
    if (!pdlApiKey) throw new Error("PDL_API_KEY is not set");

    const reqData: { criteriaJson: string; rawPrompt: string; companyContext?: string } | null =
      await ctx.runQuery(internal.pdlSearch.getSearchRequestCriteria, {
        requestId: args.requestId,
      });
    if (!reqData) throw new Error("Search request not found: " + args.requestId);

    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "searching",
    });

    const criteria: SearchCriteria = JSON.parse(reqData.criteriaJson);

    const company = reqData.companyContext ?? "";
    const lookingFor = reqData.rawPrompt;
    const chips: string[] = [];
    if (criteria.seniority) chips.push(criteria.seniority + "+ only");

    let schema: PDLSearchSchema;
    try {
      schema = await normalise(company, lookingFor, chips);
    } catch (err) {
      console.log("[pdl] normalise failed, building from criteria directly", {
        error: err instanceof Error ? err.message : String(err),
      });
      schema = {
        jobTitleRole: "engineering",
        jobTitleSubRoles: [],
        jobTitleLevels: criteria.seniority ? [criteria.seniority] : [],
        requiredSkills: criteria.mustHave.slice(0, 5),
        preferredSkills: criteria.stack.slice(0, 8),
        minYearsExperience: null,
        countries: [],
        localities: [],
      };
    }

    const query = buildQuery(schema);
    console.log("[pdl] search", {
      requestId: args.requestId,
      schema: JSON.stringify(schema),
      query: JSON.stringify(query),
    });

    const { people: pdlPeople, total } = await searchPdl(pdlApiKey, query, 50);

    const ranked = pdlPeople
      .filter((p) => p.linkedin_url)
      .map((p) => ({ person: p, pdlScore: scorePdlPerson(p, schema) }))
      .sort((a, b) => b.pdlScore - a.pdlScore)
      .slice(0, 25);

    console.log("[pdl] results", {
      requestId: args.requestId,
      total,
      withLinkedin: ranked.length,
      topScores: ranked.slice(0, 5).map((r) => ({
        name: r.person.full_name,
        score: r.pdlScore,
      })),
    });

    let peopleUpserted = 0;
    let candidatesCreated = 0;

    for (const { person, pdlScore } of ranked) {
      const linkedinUrl = person.linkedin_url!;
      const slug = slugFromLinkedin(linkedinUrl);

      const personId: Id<"people"> = await ctx.runMutation(internal.pdlSearch.upsertPerson, {
        linkedinUrl,
        fullName: person.full_name,
        headline: person.job_title,
        location: [person.location_locality, person.location_country].filter(Boolean).join(", ") || undefined,
        currentCompany: person.job_company_name,
        stacks: (person.skills ?? []).slice(0, 20),
        domains: inferDomains(person),
        yearsExperience: person.inferred_years_experience,
        socialGithub: person.github_url,
        pdlId: person.id,
        pdlData: person,
      });
      peopleUpserted++;

      await ctx.runMutation(internal.pdlSearch.createCandidateForRequest, {
        requestId: args.requestId,
        personId,
        slug,
        seniority: inferSeniority(person),
        roleKeywords: roleKeywordsFromPdl(person),
        signalConfidence: Math.min(pdlScore / 100, 1),
        reachabilityScore: person.linkedin_url ? 0.5 : 0.2,
        pdlScore,
      });
      candidatesCreated++;
    }

    console.log("[pdl] upserted", {
      requestId: args.requestId,
      peopleUpserted,
      candidatesCreated,
    });

    return { peopleUpserted, candidatesCreated, pdlTotal: total };
  },
});
