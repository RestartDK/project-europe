import { anthropic } from "@ai-sdk/anthropic";
import { Agent, stepCountIs } from "@convex-dev/agent";
import { components } from "./_generated/api";

import { defaultRankingModel } from "./lib/ranking";

export const assistantAgent = new Agent(components.agent, {
  name: "Assistant",
  languageModel: anthropic(defaultRankingModel),
  instructions: "You are a helpful assistant.",
  stopWhen: stepCountIs(10),
});

export const searchIntakeAgent = new Agent(components.agent, {
  name: "SearchIntake",
  languageModel: anthropic(defaultRankingModel),
  instructions:
    "You convert free-text hiring and candidate-search requests into a compact JSON object for downstream candidate discovery. Extract only what the user implied. Use empty arrays when unknown. Do not invent employers, credentials, or constraints.",
  stopWhen: stepCountIs(5),
});

export const rankingAgent = new Agent(components.agent, {
  name: "CandidateRanking",
  languageModel: anthropic(defaultRankingModel),
  instructions:
    "You rank candidates for a hiring search. Stay grounded in the provided candidate payloads and evidence only. Do not invent evidence, jobs, projects, or links. Return concise recruiter-facing explanations with explicit tradeoffs.",
  stopWhen: stepCountIs(6),
});
