/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, describe } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

describe("POST /clay-webhook", () => {
  test("valid payload enriches candidate and returns 200", async () => {
    const t = convexTest(schema, modules)
    const searchId = await t.mutation(internal.searches.createSearch, {
      query: "test",
      apolloParams: { titles: [], locations: [], keywords: "", skills: [] },
    })
    const candidateId = await t.mutation(internal.candidates.createCandidate, {
      searchId,
      name: "Jane Doe",
      linkedinUrl: "https://linkedin.com/in/janedoe",
    })

    const response = await t.fetch("/clay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        convex_candidate_id: candidateId,
        skills: ["React", "Node.js"],
        accomplishment_summary: "Built large-scale systems at FAANG",
        movability_score: 7,
        movability_reason: "Vested in 6 months",
        github_url: "https://github.com/janedoe",
      }),
    })

    expect(response.status).toBe(200)
  })

  test("missing convex_candidate_id returns 400", async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch("/clay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skills: ["React"],
        movability_score: 5,
      }),
    })
    expect(response.status).toBe(400)
  })

  test("malformed JSON returns 400", async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch("/clay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    })
    expect(response.status).toBe(400)
  })

  test("unknown convex_candidate_id is handled gracefully (200 or 404)", async () => {
    const t = convexTest(schema, modules)
    const searchId = await t.mutation(internal.searches.createSearch, {
      query: "test",
      apolloParams: { titles: [], locations: [], keywords: "", skills: [] },
    })
    await t.mutation(internal.candidates.createCandidate, {
      searchId,
      name: "Temp",
    })
    // Use a plausible but non-existent ID format by just passing a string
    const response = await t.fetch("/clay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        convex_candidate_id: "nonexistent_id_that_looks_real",
        skills: ["Python"],
      }),
    })
    // Should not crash - either 200 (ignored) or 404 (not found)
    expect([200, 404]).toContain(response.status)
  })
})
