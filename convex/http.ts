import { httpRouter } from "convex/server";

import { api } from "./_generated/api";
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

export default http;
