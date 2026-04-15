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
    console.log("[clay:stub] start import + ranking", { requestId: args.requestId });

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

    console.log("[clay:stub] seeded candidates from fixture", {
      requestId: args.requestId,
      candidateCount: seeded.candidateCount,
    });

    await ctx.runMutation(internal.rankingActions.setSearchRequestStatus, {
      requestId: args.requestId,
      status: "clay_queued",
    });

    const ranking = await ctx.runAction(internal.rankingActions.runRanking, {
      requestId: args.requestId,
    });

    console.log("[clay:stub] ranking finished", {
      requestId: args.requestId,
      rankingRunId: ranking.rankingRunId,
      rankingStatus: ranking.status,
      candidateCount: seeded.candidateCount,
    });

    return { status: "ranked", candidateCount: seeded.candidateCount };
  },
});

