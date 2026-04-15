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

    try {
      const extracted = await ctx.runAction(api.intake.extractSearchCriteria, {
        prompt,
        companyContext,
      });

      const search = await ctx.runQuery(api.ranking.getSearchResults, {
        requestId: extracted.requestId,
      });

      if (!search) {
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

      return Response.json({
        requestId: extracted.requestId,
        threadId: extracted.threadId,
        criteria: JSON.parse(extracted.criteriaJson),
        status: search.status,
        rankingNotes: search.rankingNotes,
        rankingVersion: search.rankingVersion,
        results: search.results,
        dossiers: dossiers.filter(Boolean),
      });
    } catch (error) {
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
