import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { parseCriteria, type SearchCriteria } from "./lib/ranking";

// ---------------------------------------------------------------------------
// Scoring: pool candidate vs search criteria
// ---------------------------------------------------------------------------

function scorePool(person: Doc<"candidatePool">, criteria: SearchCriteria): number {
  let score = 0;

  const personSkills = (person.skills ?? []).map((s) => s.toLowerCase());
  const criteriaSkills = [
    ...criteria.stack,
    ...criteria.mustHave,
    ...criteria.niceToHave,
  ].map((s) => s.toLowerCase());

  // Skill overlap (0-50)
  if (criteriaSkills.length > 0) {
    const hits = criteriaSkills.filter((s) =>
      personSkills.some((ps) => ps.includes(s) || s.includes(ps)),
    ).length;
    score += (hits / criteriaSkills.length) * 50;
  } else {
    score += 25;
  }

  // Seniority match (0-30)
  const wantedSeniority = (criteria.seniority ?? "").toLowerCase();
  if (wantedSeniority) {
    const seniorMap: Record<string, string[]> = {
      senior: ["senior", "staff", "principal"],
      staff: ["senior", "staff", "principal"],
      mid: ["senior", "entry"],
      junior: ["entry", "training"],
      lead: ["senior", "manager"],
      manager: ["manager", "director"],
    };
    const targets = seniorMap[wantedSeniority] ?? [wantedSeniority];
    const personLevels = person.jobTitleLevels ?? [];
    score += personLevels.some((l) => targets.includes(l)) ? 30 : 0;
  } else {
    score += 15;
  }

  // Role/title keyword match (0-20)
  const title = (person.currentTitle ?? "").toLowerCase();
  const roleWords = criteria.roleTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const titleHits = roleWords.filter((w) => title.includes(w)).length;
  score += Math.min(20, (titleHits / Math.max(1, roleWords.length)) * 20);

  return Math.round(score);
}

// ---------------------------------------------------------------------------
// Map pool doc → candidates table row shape
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function poolToCandidate(
  person: Doc<"candidatePool">,
  score: number,
) {
  const seniority = person.jobTitleLevels?.[0] ?? "mid";
  const title = person.currentTitle ?? "Software Engineer";
  const company = person.currentCompany ?? "";

  return {
    slug: slugify(person.name),
    fullName: person.name,
    headline: title,
    summary: company ? `${title} at ${company}.` : title,
    location: person.location,
    currentCompany: company || undefined,
    profileUrl: person.linkedinUrl,
    yearsExperience: 0,
    seniority,
    stacks: person.skills ?? [],
    domains: [],
    roleKeywords: title
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 3),
    signalConfidence: Math.min(100, score),
    reachabilityScore: person.linkedinUrl ? 60 : 30,
    socialGithub: person.githubUrl,
  };
}

// ---------------------------------------------------------------------------
// Main action: pull from pool, score, seed candidates, run ranking
// ---------------------------------------------------------------------------

export const enqueueStub = internalAction({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({ status: v.literal("ranked"), candidateCount: v.number() }),
  handler: async (
    ctx,
    args,
  ): Promise<{ status: "ranked"; candidateCount: number }> => {
    console.log("[clay:pool] start pool-based pipeline", { requestId: args.requestId });

    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "importing_candidates",
    });

    // Get the search criteria
    const request = await ctx.runQuery(internal.clay.getSearchRequest, {
      requestId: args.requestId,
    });
    const criteria: SearchCriteria = parseCriteria(request.criteriaJson) ?? {
      roleTitle: "",
      stack: [],
      domain: "",
      mustHave: [],
      niceToHave: [],
      evidenceSignals: [],
      sharpeningQuestions: [],
    };

    // Pull all pool candidates and score them
    const poolPeople = await ctx.runQuery(internal.candidatePool.getAllForScoring);

    let candidateCount: number;

    if (poolPeople.length === 0) {
      // Fallback to stubs if pool is empty
      console.log("[clay:pool] pool empty, falling back to stubs");
      const seeded = await ctx.runMutation(internal.rankingActions.seedStubCandidates, {
        requestId: args.requestId,
      });
      candidateCount = seeded.candidateCount;
    } else {
      // Score and pick top 15
      const scored = poolPeople
        .map((p) => ({ person: p, score: scorePool(p, criteria) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      console.log("[clay:pool] top candidates from pool", {
        requestId: args.requestId,
        poolSize: poolPeople.length,
        selected: scored.length,
        topScores: scored.slice(0, 5).map((s) => ({
          name: s.person.name,
          score: s.score,
        })),
      });

      // Insert as candidates + minimal evidence
      const seeded = await ctx.runMutation(internal.clay.seedFromPool, {
        requestId: args.requestId,
        candidates: scored.map(({ person, score }) => ({
          ...poolToCandidate(person, score),
          evidenceTitle: `${person.currentTitle ?? "Engineer"} at ${person.currentCompany ?? "Unknown"}`,
          evidenceSnippet: person.skills?.length
            ? `Skills include: ${person.skills.slice(0, 6).join(", ")}.`
            : `${person.currentTitle ?? "Software Engineer"} based in ${person.location ?? "Spain"}.`,
        })),
      });
      candidateCount = seeded.candidateCount;
    }

    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "clay_queued",
    });

    const ranking = await ctx.runAction(internal.rankingActions.runRanking, {
      requestId: args.requestId,
    });

    console.log("[clay:pool] ranking finished", {
      requestId: args.requestId,
      rankingRunId: ranking.rankingRunId,
      rankingStatus: ranking.status,
      candidateCount,
    });

    return { status: "ranked", candidateCount };
  },
});

export const getSearchRequest = internalQuery({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({ criteriaJson: v.string() }),
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error(`searchRequest not found: ${args.requestId}`);
    return { criteriaJson: req.criteriaJson };
  },
});

export const seedFromPool = internalMutation({
  args: {
    requestId: v.id("searchRequests"),
    candidates: v.array(
      v.object({
        slug: v.string(),
        fullName: v.string(),
        headline: v.string(),
        summary: v.string(),
        location: v.optional(v.string()),
        currentCompany: v.optional(v.string()),
        profileUrl: v.optional(v.string()),
        yearsExperience: v.number(),
        seniority: v.string(),
        stacks: v.array(v.string()),
        domains: v.array(v.string()),
        roleKeywords: v.array(v.string()),
        signalConfidence: v.number(),
        reachabilityScore: v.number(),
        socialGithub: v.optional(v.string()),
        evidenceTitle: v.string(),
        evidenceSnippet: v.string(),
      }),
    ),
  },
  returns: v.object({ candidateCount: v.number() }),
  handler: async (ctx, args) => {
    for (const c of args.candidates) {
      const candidateId = await ctx.db.insert("candidates", {
        requestId: args.requestId,
        slug: c.slug,
        fullName: c.fullName,
        headline: c.headline,
        summary: c.summary,
        location: c.location,
        currentCompany: c.currentCompany,
        profileUrl: c.profileUrl,
        yearsExperience: c.yearsExperience,
        seniority: c.seniority,
        stacks: c.stacks,
        domains: c.domains,
        roleKeywords: c.roleKeywords,
        signalConfidence: c.signalConfidence,
        reachabilityScore: c.reachabilityScore,
        socialGithub: c.socialGithub,
      });

      await ctx.db.insert("candidateEvidence", {
        requestId: args.requestId,
        candidateId,
        evidenceId: `emp-${c.slug}`,
        kind: "employment",
        title: c.evidenceTitle,
        snippet: c.evidenceSnippet,
        strength: 0.6,
        recencyYears: 0,
        tags: c.stacks.slice(0, 4),
      });
    }

    return { candidateCount: args.candidates.length };
  },
});

