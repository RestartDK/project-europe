import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  searchRequests: defineTable({
    threadId: v.string(),
    rawPrompt: v.string(),
    companyContext: v.optional(v.string()),
    criteriaJson: v.string(),
    status: v.union(v.literal("ready_for_clay"), v.literal("clay_queued")),
  }).index("by_threadId", ["threadId"]),
});

