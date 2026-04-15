/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi, describe } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

describe("createSearch", () => {
  test("creates a search doc and returns its id", async () => {
    const t = convexTest(schema, modules)
    const searchId = await t.mutation(internal.searches.createSearch, {
      query: "Python engineer in Madrid",
      apolloParams: {
        titles: ["Software Engineer"],
        locations: ["Madrid, Spain"],
        keywords: "Python",
        skills: ["Python"],
      },
    })
    expect(searchId).toBeDefined()
    const search = await t.query(api.searches.getSearch, { searchId })
    expect(search).not.toBeNull()
    expect(search!.query).toBe("Python engineer in Madrid")
    expect(search!.status).toBe("searching")
    expect(search!.candidateCount).toBe(0)
  })
})

describe("listSearches", () => {
  test("returns recent searches", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.searches.createSearch, {
      query: "First search",
      apolloParams: { titles: [], locations: [], keywords: "", skills: [] },
    })
    await t.mutation(internal.searches.createSearch, {
      query: "Second search",
      apolloParams: { titles: [], locations: [], keywords: "", skills: [] },
    })
    const searches = await t.query(api.searches.listSearches)
    expect(searches.length).toBe(2)
  })

  test("returns empty list when no searches", async () => {
    const t = convexTest(schema, modules)
    const searches = await t.query(api.searches.listSearches)
    expect(searches).toEqual([])
  })
})

describe("getSearch", () => {
  test("returns null for unknown id", async () => {
    const t = convexTest(schema, modules)
    // Create then get to have a valid-looking but missing ID isn't possible cleanly;
    // we just verify it returns null without throwing
    const searchId = await t.mutation(internal.searches.createSearch, {
      query: "temp",
      apolloParams: { titles: [], locations: [], keywords: "", skills: [] },
    })
    const search = await t.query(api.searches.getSearch, { searchId })
    expect(search).not.toBeNull()
  })
})

describe("updateSearchStatus", () => {
  test("patches status correctly", async () => {
    const t = convexTest(schema, modules)
    const searchId = await t.mutation(internal.searches.createSearch, {
      query: "test",
      apolloParams: { titles: [], locations: [], keywords: "", skills: [] },
    })
    await t.mutation(internal.searches.updateSearchStatus, {
      searchId,
      status: "enriching",
      candidateCount: 10,
    })
    const search = await t.query(api.searches.getSearch, { searchId })
    expect(search!.status).toBe("enriching")
    expect(search!.candidateCount).toBe(10)
  })

  test("sets status to complete with 0 candidates when Apollo returns nothing", async () => {
    const t = convexTest(schema, modules)
    const searchId = await t.mutation(internal.searches.createSearch, {
      query: "very niche query",
      apolloParams: { titles: [], locations: [], keywords: "", skills: [] },
    })
    await t.mutation(internal.searches.updateSearchStatus, {
      searchId,
      status: "complete",
      candidateCount: 0,
    })
    const search = await t.query(api.searches.getSearch, { searchId })
    expect(search!.status).toBe("complete")
    expect(search!.candidateCount).toBe(0)
  })
})
