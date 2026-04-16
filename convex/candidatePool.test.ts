/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, describe } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.ts")

const SAMPLE_PEOPLE = [
  {
    name: "Alice García",
    linkedinUrl: "https://linkedin.com/in/aliceg",
    currentTitle: "Senior Software Engineer",
    currentCompany: "Acme Corp",
    location: "Madrid, Spain",
    skills: ["golang", "kubernetes", "postgresql"],
    jobTitleLevels: ["senior"],
    jobTitleSubRole: "backend",
    jobTitleRole: "engineering",
  },
  {
    name: "Bob Martínez",
    linkedinUrl: "https://linkedin.com/in/bobm",
    currentTitle: "Frontend Engineer",
    currentCompany: "Startup SL",
    location: "Madrid, Spain",
    skills: ["typescript", "react", "css"],
    jobTitleLevels: ["entry"],
    jobTitleSubRole: "frontend",
    jobTitleRole: "engineering",
  },
]

describe("insertBatch", () => {
  test("inserts people and returns inserted count", async () => {
    const t = convexTest(schema, modules)
    const count = await t.mutation(internal.candidatePool.insertBatch, {
      people: SAMPLE_PEOPLE,
    })
    expect(count).toBe(2)
    const stats = await t.query(api.candidatePool.getPoolStats)
    expect(stats.count).toBe(2)
  })

  test("handles empty batch without error", async () => {
    const t = convexTest(schema, modules)
    const count = await t.mutation(internal.candidatePool.insertBatch, {
      people: [],
    })
    expect(count).toBe(0)
  })

  test("stores all optional fields correctly", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.candidatePool.insertBatch, {
      people: [SAMPLE_PEOPLE[0]],
    })
    const all = await t.query(internal.candidatePool.getAllForScoring)
    expect(all[0].name).toBe("Alice García")
    expect(all[0].skills).toEqual(["golang", "kubernetes", "postgresql"])
    expect(all[0].jobTitleLevels).toEqual(["senior"])
    expect(all[0].jobTitleSubRole).toBe("backend")
    expect(all[0].importedAt).toBeGreaterThan(0)
  })

  test("minimal record with only name", async () => {
    const t = convexTest(schema, modules)
    const count = await t.mutation(internal.candidatePool.insertBatch, {
      people: [{ name: "Minimal Person" }],
    })
    expect(count).toBe(1)
    const all = await t.query(internal.candidatePool.getAllForScoring)
    expect(all[0].name).toBe("Minimal Person")
    expect(all[0].skills).toBeUndefined()
  })
})

describe("getPoolStats", () => {
  test("returns 0 for empty pool", async () => {
    const t = convexTest(schema, modules)
    const stats = await t.query(api.candidatePool.getPoolStats)
    expect(stats.count).toBe(0)
  })

  test("returns correct count after multiple inserts", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.candidatePool.insertBatch, { people: SAMPLE_PEOPLE })
    await t.mutation(internal.candidatePool.insertBatch, {
      people: [{ name: "Third Person" }],
    })
    const stats = await t.query(api.candidatePool.getPoolStats)
    expect(stats.count).toBe(3)
  })
})

describe("getAllForScoring", () => {
  test("returns empty array when pool is empty", async () => {
    const t = convexTest(schema, modules)
    const all = await t.query(internal.candidatePool.getAllForScoring)
    expect(all).toEqual([])
  })

  test("returns all inserted people with correct fields", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.candidatePool.insertBatch, { people: SAMPLE_PEOPLE })
    const all = await t.query(internal.candidatePool.getAllForScoring)
    expect(all.length).toBe(2)
    const names = all.map((p) => p.name)
    expect(names).toContain("Alice García")
    expect(names).toContain("Bob Martínez")
  })
})

describe("clearPool", () => {
  test("removes all records from the pool", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.candidatePool.insertBatch, { people: SAMPLE_PEOPLE })
    expect((await t.query(api.candidatePool.getPoolStats)).count).toBe(2)

    await t.mutation(internal.candidatePool.clearPool)

    expect((await t.query(api.candidatePool.getPoolStats)).count).toBe(0)
  })

  test("is idempotent on empty pool", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.candidatePool.clearPool)
    const stats = await t.query(api.candidatePool.getPoolStats)
    expect(stats.count).toBe(0)
  })
})
