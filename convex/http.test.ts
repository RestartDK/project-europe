/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("POST /clay-webhook", () => {
  test("valid payload enriches person and returns 200", async () => {
    const t = convexTest(schema, modules);

    const personId = await t.run(async (ctx) => {
      return await ctx.db.insert("people", {
        linkedinUrl: "https://linkedin.com/in/janedoe",
        fullName: "Jane Doe",
        stacks: [],
        domains: [],
        clayEnriched: false,
      });
    });
    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("searchRequests", {
        threadId: "t1",
        rawPrompt: "test",
        criteriaJson: "{}",
        status: "ranked",
        promptVersion: "v1",
      });
    });
    const candidateId = await t.run(async (ctx) => {
      return await ctx.db.insert("candidates", {
        requestId,
        personId,
        slug: "janedoe",
        seniority: "senior",
        roleKeywords: [],
        signalConfidence: 0.5,
        reachabilityScore: 0.5,
      });
    });

    const response = await t.fetch("/clay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        convex_candidate_id: candidateId,
        email: "jane@example.com",
        social_github: "https://github.com/janedoe",
      }),
    });

    expect(response.status).toBe(200);
  });

  test("missing convex_candidate_id returns 400", async () => {
    const t = convexTest(schema, modules);
    const response = await t.fetch("/clay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    expect(response.status).toBe(400);
  });

  test("malformed JSON returns 400", async () => {
    const t = convexTest(schema, modules);
    const response = await t.fetch("/clay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(response.status).toBe(400);
  });
});
