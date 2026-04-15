import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { Id } from "./_generated/dataModel"

const http = httpRouter()

http.route({
  path: "/clay-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
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
      )
    }

    const data = body as Record<string, unknown>
    const candidateId = data.convex_candidate_id as Id<"candidates">

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
      })
    } catch (err) {
      // Validator errors (malformed ID) or not-found errors → 404
      const message = err instanceof Error ? err.message : String(err)
      if (
        message.includes("not found") ||
        message.includes("invalid id") ||
        message.includes("Validator error") ||
        message.includes("Expected ID for table")
      ) {
        return new Response(JSON.stringify({ error: "Candidate not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      throw err
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }),
})

export default http
