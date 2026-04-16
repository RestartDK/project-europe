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
        search.results.map(async (result: { scoreId: Id<"candidateScores"> }) =>
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
        topPreview: payload.results.slice(0, 5).map((r: { rank: number; fullName: string; finalScore: number }) => ({
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
    const rawText = await req.text();
    console.log("[clay-webhook] raw request body:", rawText);

    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch (e) {
      console.log("[clay-webhook] JSON parse error:", String(e));
      return new Response(JSON.stringify({ error: "Invalid JSON", raw: rawText }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[clay-webhook] parsed body:", JSON.stringify(body));

    if (
      typeof body !== "object" ||
      body === null ||
      !("convex_candidate_id" in body) ||
      typeof (body as Record<string, unknown>).convex_candidate_id !== "string"
    ) {
      console.log("[clay-webhook] validation failed — missing or invalid convex_candidate_id", { body: JSON.stringify(body) });
      return new Response(
        JSON.stringify({ error: "Missing required field: convex_candidate_id", received: body }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = body as Record<string, unknown>;
    const candidateId = data.convex_candidate_id as Id<"candidates">;

    console.log("[clay-webhook] received", { candidateId, body: JSON.stringify(data) });

    const s = (v: unknown): string | undefined =>
      typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

    try {
      await ctx.runMutation(internal.candidates.updateFromClay, {
        candidateId,
        email: s(data.email),
        socialGithub: s(data.social_github),
        socialTwitter: s(data.social_twitter),
        socialBlog: s(data.social_blog),
        currentCompany: s(data.current_company),
        headline: s(data.headline),
        summary: s(data.summary),
        location: s(data.location),
        stacks: Array.isArray(data.stacks) ? (data.stacks as string[]) : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("[clay-webhook] mutation error:", { candidateId, error: message });
      if (
        message.includes("not found") ||
        message.includes("invalid id") ||
        message.includes("Validator error") ||
        message.includes("Expected ID for table")
      ) {
        return new Response(JSON.stringify({ error: "Candidate not found", detail: message }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    console.log("[clay-webhook] updated candidate", { candidateId });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/push-to-clay",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // no body is fine — will push all candidates
    }

    const requestId =
      typeof body.requestId === "string" ? body.requestId : undefined;

    try {
      const result = await ctx.runAction(internal.clay.pushCandidatesToClay, {
        requestId: requestId as Id<"searchRequests"> | undefined,
      });
      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }),
});

export default http;
