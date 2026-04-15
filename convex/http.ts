import { httpRouter } from "convex/server";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/api/rank",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    const prompt =
      typeof body === "object" &&
      body !== null &&
      "prompt" in body &&
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    const companyContext =
      typeof body === "object" &&
      body !== null &&
      "companyContext" in body &&
      typeof body.companyContext === "string" &&
      body.companyContext.trim().length > 0
        ? body.companyContext.trim()
        : undefined;

    if (!prompt) {
      return Response.json(
        { error: "Missing required field `prompt`." },
        { status: 400 },
      );
    }

    console.log("[http:/api/rank] request", {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 300),
      hasCompanyContext: Boolean(companyContext),
    });

    try {
      const extracted = await ctx.runAction(api.intake.extractSearchCriteria, {
        prompt,
        companyContext,
      });

      const search = await ctx.runQuery(api.ranking.getSearchResults, {
        requestId: extracted.requestId,
      });

      if (!search) {
        console.log("[http:/api/rank] no search results after ranking", {
          requestId: extracted.requestId,
        });
        return Response.json(
          { error: "Ranking completed, but no search results were found." },
          { status: 500 },
        );
      }

      const dossiers = await Promise.all(
        search.results.map(async (result) =>
          await ctx.runQuery(api.ranking.getCandidateDossier, {
            scoreId: result.scoreId,
          }),
        ),
      );

      const payload = {
        requestId: extracted.requestId,
        threadId: extracted.threadId,
        criteria: JSON.parse(extracted.criteriaJson),
        status: search.status,
        rankingNotes: search.rankingNotes,
        rankingVersion: search.rankingVersion,
        results: search.results,
        dossiers: dossiers.filter(Boolean),
      };

      console.log("[http:/api/rank] response", {
        requestId: payload.requestId,
        status: payload.status,
        resultCount: payload.results.length,
        dossierCount: payload.dossiers.length,
        rankingVersion: payload.rankingVersion,
        topPreview: payload.results.slice(0, 5).map((r) => ({
          rank: r.rank,
          name: r.fullName,
          score: Math.round(r.finalScore),
        })),
      });

      return Response.json(payload);
    } catch (error) {
      console.log("[http:/api/rank] error", {
        message: error instanceof Error ? error.message : String(error),
      });
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unknown ranking error.",
        },
        { status: 500 },
      );
    }
  }),
});

http.route({
  path: "/clay-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("convex_candidate_id" in body) ||
      typeof (body as Record<string, unknown>).convex_candidate_id !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required field: convex_candidate_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = body as Record<string, unknown>;
    const candidateId = data.convex_candidate_id as Id<"talentCandidates">;

    try {
      await ctx.runMutation(internal.candidates.updateFromClay, {
        candidateId,
        skills: Array.isArray(data.skills) ? (data.skills as string[]) : undefined,
        accomplishmentSummary:
          typeof data.accomplishment_summary === "string"
            ? data.accomplishment_summary
            : undefined,
        movabilityScore:
          typeof data.movability_score === "number"
            ? data.movability_score
            : undefined,
        movabilityReason:
          typeof data.movability_reason === "string"
            ? data.movability_reason
            : undefined,
        githubUrl:
          typeof data.github_url === "string" ? data.github_url : undefined,
        rawClayData: data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("not found") ||
        message.includes("invalid id") ||
        message.includes("Validator error") ||
        message.includes("Expected ID for table")
      ) {
        return new Response(JSON.stringify({ error: "Candidate not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ---------------------------------------------------------------------------
// Title inference helpers for /pool-ingest
// ---------------------------------------------------------------------------

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

const LEVEL_PATTERNS: Array<[RegExp, string]> = [
  [/\b(staff|principal)\b/i, "senior"],
  [/\bsenior\b/i, "senior"],
  [/\bjunior\b/i, "entry"],
  [/\b(intern|trainee|apprentice)\b/i, "training"],
  [/\b(vp|vice president)\b/i, "vp"],
  [/\bdirector\b/i, "director"],
  [/\bmanager\b/i, "manager"],
  [/\b(cto|ceo|coo|cpo|chief)\b/i, "cxo"],
]
function inferLevels(title: string): string[] | undefined {
  for (const [re, level] of LEVEL_PATTERNS) if (re.test(title)) return [level]
  return undefined
}
const SUBROLE_PATTERNS: Array<[RegExp, string]> = [
  [/\bfrontend\b|\bfront-end\b/i, "frontend"],
  [/\bbackend\b|\bback-end\b/i, "backend"],
  [/\bfull.?stack\b/i, "full stack"],
  [/\bdevops\b|\bsre\b/i, "devops"],
  [/\bmachine learning\b|\bml engineer\b/i, "machine learning"],
  [/\bdata engineer\b/i, "data"],
  [/\bmobile\b|\bios\b|\bandroid\b/i, "mobile"],
  [/\bsecurity\b/i, "security"],
  [/\b(platform|infrastructure|infra)\b/i, "platform"],
]
function inferSubRole(title: string): string {
  for (const [re, role] of SUBROLE_PATTERNS) if (re.test(title)) return role
  return "software"
}
function inferRole(title: string): string {
  if (/\b(engineer|developer|programmer|architect|devops|sre)\b/i.test(title)) return "engineering"
  if (/\bdesigner?\b/i.test(title)) return "design"
  if (/\bproduct\b/i.test(title)) return "product"
  return "engineering"
}

// POST /pool-ingest — one Clay row at a time
http.route({
  path: "/pool-ingest",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: unknown
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
    const d = body as Record<string, unknown>
    const name = str(d.name)
    if (!name) return new Response(JSON.stringify({ error: "name is required" }), { status: 400, headers: { "Content-Type": "application/json" } })
    const title = str(d.title) ?? ""
    await ctx.runMutation(internal.candidatePool.insertBatch, {
      people: [{ name, currentTitle: title || undefined, currentCompany: str(d.company), location: str(d.location), linkedinUrl: str(d.linkedin), jobTitleLevels: inferLevels(title), jobTitleSubRole: inferSubRole(title), jobTitleRole: inferRole(title) }],
    })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  }),
})

// POST /import-pool — bulk import JSON array
http.route({
  path: "/import-pool",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: unknown
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
    const data = body as Record<string, unknown>
    const people = data.people
    if (!Array.isArray(people)) return new Response(JSON.stringify({ error: "Expected { people: [...] }" }), { status: 400, headers: { "Content-Type": "application/json" } })
    if (data.replace === true) await ctx.runMutation(internal.candidatePool.clearPool)
    let inserted = 0
    for (let i = 0; i < people.length; i += 50) {
      const batch = (people.slice(i, i + 50) as Array<Record<string, unknown>>).map((p) => ({
        name: String(p.name ?? "Unknown"),
        linkedinUrl: p.linkedinUrl != null ? String(p.linkedinUrl) : undefined,
        currentTitle: p.currentTitle != null ? String(p.currentTitle) : undefined,
        currentCompany: p.currentCompany != null ? String(p.currentCompany) : undefined,
        location: p.location != null ? String(p.location) : undefined,
        skills: Array.isArray(p.skills) ? (p.skills as string[]) : undefined,
        jobTitleLevels: Array.isArray(p.jobTitleLevels) ? (p.jobTitleLevels as string[]) : undefined,
        jobTitleSubRole: p.jobTitleSubRole != null ? String(p.jobTitleSubRole) : undefined,
        jobTitleRole: p.jobTitleRole != null ? String(p.jobTitleRole) : undefined,
        githubUrl: p.githubUrl != null ? String(p.githubUrl) : undefined,
      }))
      inserted += await ctx.runMutation(internal.candidatePool.insertBatch, { people: batch })
    }
    return new Response(JSON.stringify({ ok: true, inserted }), { status: 200, headers: { "Content-Type": "application/json" } })
  }),
})

// DELETE /import-pool — wipe the pool
http.route({
  path: "/import-pool",
  method: "DELETE",
  handler: httpAction(async (ctx) => {
    const deleted = await ctx.runMutation(internal.candidatePool.clearPool)
    return new Response(JSON.stringify({ ok: true, deleted }), { status: 200, headers: { "Content-Type": "application/json" } })
  }),
})

export default http;
