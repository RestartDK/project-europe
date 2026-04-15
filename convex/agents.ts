import { anthropic } from "@ai-sdk/anthropic";
import { Agent, stepCountIs } from "@convex-dev/agent";
import { components } from "./_generated/api";

export const assistantAgent = new Agent(components.agent, {
  name: "Assistant",
  languageModel: anthropic.chat("claude-sonnet-4-20250514"),
  instructions: "You are a helpful assistant.",
  stopWhen: stepCountIs(10),
});

export const searchIntakeAgent = new Agent(components.agent, {
  name: "SearchIntake",
  languageModel: anthropic.chat("claude-sonnet-4-20250514"),
  instructions:
    "You convert free-text hiring and candidate-search requests into a compact JSON object for downstream candidate discovery. Extract only what the user implied. Use empty arrays when unknown. Do not invent employers, credentials, or constraints.",
  stopWhen: stepCountIs(5),
});
