import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const enqueueStub = internalAction({
  args: { requestId: v.id("searchRequests") },
  returns: v.object({ status: v.literal("ranked"), candidateCount: v.number() }),
  handler: async (
    ctx,
    args,
  ): Promise<{ status: "ranked"; candidateCount: number }> => {
    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "importing_candidates",
    });

    const seeded: { candidateCount: number } = await ctx.runMutation(
      internal.rankingActions.seedStubCandidates,
      {
        requestId: args.requestId,
      },
    );

    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "clay_queued",
    });

    await ctx.runAction(internal.rankingActions.runRanking, {
      requestId: args.requestId,
    });

    return { status: "ranked", candidateCount: seeded.candidateCount };
  },
});

