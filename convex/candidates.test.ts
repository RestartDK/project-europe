/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, describe } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

async function setupTestData(t: ReturnType<typeof convexTest>) {
  const requestId = await t.run(async (ctx) => {
    return await ctx.db.insert("searchRequests", {
      threadId: "test-thread",
      rawPrompt: "test",
      criteriaJson: "{}",
      status: "ranked",
      promptVersion: "v1",
    })
  })

  const personId = await t.run(async (ctx) => {
    return await ctx.db.insert("people", {
      linkedinUrl: "https://linkedin.com/in/bob-jones",
      fullName: "Bob Jones",
      headline: "Engineer",
      summary: "Engineer at Acme",
      stacks: [],
      domains: [],
      yearsExperience: 5,
      clayEnriched: false,
    })
  })

  const candidateId = await t.run(async (ctx) => {
    return await ctx.db.insert("candidates", {
      requestId,
      personId,
      slug: "bob-jones",
      seniority: "senior",
      roleKeywords: [],
      signalConfidence: 0.5,
      reachabilityScore: 0.5,
    })
  })

  return { requestId, personId, candidateId }
}

describe("updateFromClay", () => {
  test("enriches the person record via candidate lookup", async () => {
    const t = convexTest(schema, modules)
    const { candidateId, personId } = await setupTestData(t)

    await t.mutation(internal.candidates.updateFromClay, {
      candidateId,
      stacks: ["Python", "TypeScript"],
      socialGithub: "https://github.com/bob",
    })

    const person = await t.run(async (ctx) => {
      return await ctx.db.get(personId)
    })
    expect(person).not.toBeNull()
    expect(person!.stacks).toEqual(["Python", "TypeScript"])
    expect(person!.socialGithub).toBe("https://github.com/bob")
    expect(person!.clayEnriched).toBe(true)
    expect(person!.enrichmentStatus).toBe("complete")
    expect(person!.enrichmentCompletedAt).toEqual(expect.any(Number))
  })

  test("is idempotent — second call overwrites first", async () => {
    const t = convexTest(schema, modules)
    const { candidateId, personId } = await setupTestData(t)

    await t.mutation(internal.candidates.updateFromClay, {
      candidateId,
      stacks: ["Go"],
    })
    await t.mutation(internal.candidates.updateFromClay, {
      candidateId,
      stacks: ["Go", "Rust"],
    })

    const person = await t.run(async (ctx) => {
      return await ctx.db.get(personId)
    })
    expect(person!.stacks).toEqual(["Go", "Rust"])
  })
})
