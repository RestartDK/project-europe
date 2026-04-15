import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const enqueueStub = internalAction({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({ status: v.literal("not_implemented") }),
  handler: async () => {
    return { status: "not_implemented" as const };
  },
});

