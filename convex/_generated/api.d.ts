/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as agents from "../agents.js";
import type * as candidates from "../candidates.js";
import type * as clay from "../clay.js";
import type * as http from "../http.js";
import type * as intake from "../intake.js";
import type * as lib_candidateStubs from "../lib/candidateStubs.js";
import type * as lib_pdl from "../lib/pdl.js";
import type * as lib_ranking from "../lib/ranking.js";
import type * as lib_signals from "../lib/signals.js";
import type * as pdlSearch from "../pdlSearch.js";
import type * as ranking from "../ranking.js";
import type * as rankingActions from "../rankingActions.js";
import type * as searchTest from "../searchTest.js";
import type * as status from "../status.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agents: typeof agents;
  candidates: typeof candidates;
  clay: typeof clay;
  http: typeof http;
  intake: typeof intake;
  "lib/candidateStubs": typeof lib_candidateStubs;
  "lib/pdl": typeof lib_pdl;
  "lib/ranking": typeof lib_ranking;
  "lib/signals": typeof lib_signals;
  pdlSearch: typeof pdlSearch;
  ranking: typeof ranking;
  rankingActions: typeof rankingActions;
  searchTest: typeof searchTest;
  status: typeof status;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
