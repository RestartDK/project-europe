/**
 * Dev-only test action — runs the full PDL pipeline and returns results
 * directly without writing to the database or pushing to Clay.
 *
 * Usage:
 *   bunx convex run searchTest:testPDL '{
 *     "company": "Series A infra tooling startup, 25 engineers",
 *     "lookingFor": "Senior backend engineer, strong in Go or Rust, distributed systems",
 *     "chips": ["senior+ only"]
 *   }'
 */

import { v } from "convex/values"
import { action } from "./_generated/server"

interface PDLSearchSchema {
  jobTitleRole: string | null
  jobTitleSubRoles: string[]
  jobTitleLevels: string[]
  requiredSkills: string[]
  preferredSkills: string[]
  minYearsExperience: number | null
  countries: string[]
  localities: string[]
}

interface PDLPerson {
  id: string
  full_name: string
  job_title?: string
  job_title_role?: string
  job_title_sub_role?: string
  job_title_levels?: string[]
  job_company_name?: string
  linkedin_url?: string
  github_url?: string
  location_name?: string
  location_locality?: string
  location_country?: string
  skills?: string[]
  inferred_years_experience?: number
}

async function claudeJson<T>(prompt: string): Promise<T> {
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
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  if (!response.ok) throw new Error(`Claude API error: ${response.status}`)
  const data = await response.json()
  const text = (data.content[0].text as string).trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON in Claude response")
  return JSON.parse(jsonMatch[0]) as T
}

async function normalise(company: string, lookingFor: string, chips: string[]): Promise<PDLSearchSchema> {
  const chipsStr = chips.length > 0 ? chips.join(", ") : "none"
  const raw = await claudeJson<PDLSearchSchema>(`
You are a talent search API specialist. Translate the hiring context below into
a structured search specification that maps exactly to People Data Labs (PDL) API fields.

HIRING CONTEXT
Company: ${company}
Role: ${lookingFor}
Search refinements (chips): ${chipsStr}

OUTPUT RULES — return ONLY valid JSON with these exact keys:

"jobTitleRole": one of ["engineering","design","marketing","sales","finance","legal",
  "human resources","operations","product","data","media","education","support","health"]
  or null if unclear.

"jobTitleSubRoles": array (may be empty) from
  ["software","hardware","devops","data","machine learning","security","mobile",
   "frontend","backend","full stack","embedded","cloud","platform","infrastructure",
   "systems","qa","research","network"].

"jobTitleLevels": array (may be empty) from
  ["cxo","vp","director","manager","senior","entry","training"].
  "senior+ only" chip → ["senior","manager","director","vp","cxo"].
  Leave empty if seniority is not specified.

"requiredSkills": up to 5 skills (lowercase). CRITICAL RULES:
  - Only SPECIFIC technology/tool names that exist in PDL's skill index.
  - Use "golang" for Go (NOT "go"). Use "rust" for Rust.
  - Valid: "golang","rust","kubernetes","postgresql","redis","apache kafka","grpc",
    "docker","typescript","react","pytorch","terraform","elasticsearch","distributed systems".
  - NEVER abstract phrases: NO "backend development", NO "system design", NO "api design".

"preferredSkills": up to 8 technology skills (lowercase). Same rules. Related tools the
  ideal candidate likely knows. E.g. for Go backend: "grpc","postgresql","redis","docker",
  "kubernetes","apache kafka","prometheus","elasticsearch".

"minYearsExperience": integer or null. Only set if explicitly required.

"countries": lowercase country names. Only populate if a specific country is mentioned.
"localities": lowercase city names. Only populate if a specific city is mentioned.

JSON:`)

  return {
    jobTitleRole: typeof raw.jobTitleRole === "string" ? raw.jobTitleRole : null,
    jobTitleSubRoles: Array.isArray(raw.jobTitleSubRoles) ? raw.jobTitleSubRoles : [],
    jobTitleLevels: Array.isArray(raw.jobTitleLevels) ? raw.jobTitleLevels : [],
    requiredSkills: Array.isArray(raw.requiredSkills) ? raw.requiredSkills.slice(0, 5) : [],
    preferredSkills: Array.isArray(raw.preferredSkills) ? raw.preferredSkills.slice(0, 8) : [],
    minYearsExperience: typeof raw.minYearsExperience === "number" ? raw.minYearsExperience : null,
    countries: Array.isArray(raw.countries) ? raw.countries : [],
    localities: Array.isArray(raw.localities) ? raw.localities : [],
  }
}

function buildQuery(schema: PDLSearchSchema): object {
  const must: object[] = []
  const should: object[] = []

  if (schema.jobTitleRole) must.push({ term: { job_title_role: schema.jobTitleRole } })
  if (schema.countries.length > 0) must.push({ terms: { location_country: schema.countries } })
  if (schema.minYearsExperience !== null && schema.minYearsExperience > 0) {
    must.push({ range: { inferred_years_experience: { gte: schema.minYearsExperience - 1 } } })
  }

  for (const s of schema.jobTitleSubRoles) should.push({ term: { job_title_sub_role: s } })
  if (schema.jobTitleLevels.length > 0) should.push({ terms: { job_title_levels: schema.jobTitleLevels } })
  for (const s of schema.requiredSkills) should.push({ term: { skills: s.toLowerCase() } })
  for (const s of schema.preferredSkills) should.push({ term: { skills: s.toLowerCase() } })
  for (const l of schema.localities) should.push({ match: { location_name: l } })

  if (must.length === 0 && should.length === 0) return { match_all: {} }

  const bool: Record<string, object[]> = {}
  if (must.length > 0) bool.must = must
  if (should.length > 0) bool.should = should
  return { bool }
}

function score(person: PDLPerson, schema: PDLSearchSchema): number {
  let s = 0
  const required = schema.requiredSkills.map((x) => x.toLowerCase())
  const preferred = schema.preferredSkills.map((x) => x.toLowerCase())
  const cSkills = (person.skills ?? []).map((x) => x.toLowerCase())

  if (required.length > 0 || preferred.length > 0) {
    const rHits = required.filter((x) => cSkills.includes(x)).length
    const pHits = preferred.filter((x) => cSkills.some((c) => c === x || c.includes(x) || x.includes(c))).length
    s += (required.length > 0 ? (rHits / required.length) * 35 : 17) +
         (preferred.length > 0 ? (pHits / preferred.length) * 15 : 8)
  } else {
    s += 25
  }

  const levels = person.job_title_levels ?? []
  s += schema.jobTitleLevels.length > 0
    ? (schema.jobTitleLevels.some((l) => levels.includes(l)) ? 30 : 0)
    : 15

  s += schema.jobTitleSubRoles.length > 0
    ? (schema.jobTitleSubRoles.includes(person.job_title_sub_role ?? "") ? 20 : 5)
    : 10

  return Math.round(s)
}

export const testPDL = action({
  args: {
    company: v.string(),
    lookingFor: v.string(),
    chips: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const schema = await normalise(args.company, args.lookingFor, args.chips)
    const query = buildQuery(schema)

    console.log("\n=== NORMALISED SCHEMA ===")
    console.log(JSON.stringify(schema, null, 2))
    console.log("\n=== PDL QUERY ===")
    console.log(JSON.stringify(query, null, 2))

    const apiKey = process.env.PDL_API_KEY
    if (!apiKey) throw new Error("PDL_API_KEY is not set")

    const response = await fetch("https://api.peopledatalabs.com/v5/person/search", {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query, size: 50 }),
    })

    if (response.status === 404) {
      return { schema, query, total: 0, results: [] }
    }
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`PDL API error: ${response.status} — ${text}`)
    }

    const data = await response.json()
    const people: PDLPerson[] = data.data ?? []

    const ranked = people
      .map((p) => ({ person: p, pdlScore: score(p, schema) }))
      .sort((a, b) => b.pdlScore - a.pdlScore)
      .slice(0, 25)

    const results = ranked.map(({ person: p, pdlScore }) => ({
      pdlScore,
      name: p.full_name,
      title: p.job_title ?? "—",
      company: p.job_company_name ?? "—",
      location: [p.location_locality, p.location_country].filter(Boolean).join(", ") || "—",
      role: p.job_title_role ?? "—",
      subRole: p.job_title_sub_role ?? "—",
      levels: p.job_title_levels ?? [],
      yearsExp: p.inferred_years_experience ?? null,
      skills: (p.skills ?? []).slice(0, 8),
      linkedin: p.linkedin_url ?? "—",
      github: p.github_url ?? "—",
    }))

    console.log(`\n=== RESULTS (${people.length} from PDL → top ${results.length} after scoring) ===`)
    for (const r of results) {
      console.log(`[${r.pdlScore}] ${r.name} — ${r.title} @ ${r.company} (${r.location}) | exp: ${r.yearsExp}y | skills: ${r.skills.join(", ")}`)
    }

    return { schema, query, total: people.length, results }
  },
})
