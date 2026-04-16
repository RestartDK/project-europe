/// <reference types="node" />
import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

interface ApolloParams {
  titles: string[]
  locations: string[]
  keywords: string
  skills: string[]
}

interface ApolloPerson {
  id: string
  name: string
  title: string
  organization_name: string
  linkedin_url: string
  city: string
  state: string
  country: string
}

async function parseQueryWithClaude(query: string): Promise<ApolloParams> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Parse this talent search query into structured Apollo search parameters.
Return ONLY a valid JSON object with these exact fields:
- titles: array of job titles to search for
- locations: array of location strings (city, country format)
- keywords: a single string with relevant keywords
- skills: array of specific skills mentioned

Query: "${query}"

JSON:`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0].text.trim()

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON found in Claude response")

  const parsed = JSON.parse(jsonMatch[0])
  return {
    titles: Array.isArray(parsed.titles) ? parsed.titles : [],
    locations: Array.isArray(parsed.locations) ? parsed.locations : [],
    keywords: typeof parsed.keywords === "string" ? parsed.keywords : "",
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
  }
}

async function searchApollo(params: ApolloParams): Promise<ApolloPerson[]> {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) throw new Error("APOLLO_API_KEY is not set")

  const response = await fetch("https://api.apollo.io/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      person_titles: params.titles,
      person_locations: params.locations,
      q_keywords: params.keywords,
      page: 1,
      per_page: 10,
    }),
  })

  if (!response.ok) {
    throw new Error(`Apollo API error: ${response.status}`)
  }

  const data = await response.json()
  return data.people ?? []
}

async function pushToClayWebhook(payload: {
  linkedin_url: string
  name: string
  current_company: string
  convex_candidate_id: string
  search_id: string
}) {
  const webhookUrl = process.env.CLAY_WEBHOOK_URL
  if (!webhookUrl) return // Clay not configured yet — skip silently

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export const search = action({
  args: { query: v.string() },
  handler: async (ctx, args): Promise<Id<"searches">> => {
    // 1. Parse NL query into Apollo params via Claude
    const apolloParams = await parseQueryWithClaude(args.query)

    // 2. Create search doc
    const searchId: Id<"searches"> = await ctx.runMutation(
      internal.searches.createSearch,
      { query: args.query, pdlParams: apolloParams },
    )

    try {
      // 3. Search Apollo
      const people = await searchApollo(apolloParams)

      if (people.length === 0) {
        await ctx.runMutation(internal.searches.updateSearchStatus, {
          searchId,
          status: "complete",
          candidateCount: 0,
        })
        return searchId
      }

      // 4. Store each candidate + push to Clay
      for (const person of people) {
        const candidateId: Id<"talentCandidates"> = await ctx.runMutation(
          internal.candidates.createCandidate,
          {
            searchId,
            name: person.name,
            currentTitle: person.title || undefined,
            currentCompany: person.organization_name || undefined,
            linkedinUrl: person.linkedin_url || undefined,
            location: [person.city, person.country].filter(Boolean).join(", ") || undefined,
          },
        )

        await pushToClayWebhook({
          linkedin_url: person.linkedin_url ?? "",
          name: person.name,
          current_company: person.organization_name ?? "",
          convex_candidate_id: candidateId,
          search_id: searchId,
        })
      }

      // 5. Mark search as enriching
      await ctx.runMutation(internal.searches.updateSearchStatus, {
        searchId,
        status: "enriching",
        candidateCount: people.length,
      })
    } catch (err) {
      await ctx.runMutation(internal.searches.updateSearchStatus, {
        searchId,
        status: "error",
      })
      throw err
    }

    return searchId
  },
})
