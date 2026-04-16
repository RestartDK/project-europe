/**
 * Import a Clay CSV export into the Convex candidate pool.
 *
 * Usage:
 *   bun scripts/import-pool.ts <path/to/export.csv> [--replace]
 *
 * Options:
 *   --replace   Wipe the existing pool before importing (default: append)
 *
 * Environment:
 *   CONVEX_SITE_URL   Your Convex HTTP deployment URL
 *                     e.g. https://happy-animal-123.convex.site
 *                     (printed by `bunx convex dev` or in the Convex dashboard)
 *
 * Expected CSV columns (case-insensitive, order doesn't matter):
 *   Full Name / Name
 *   LinkedIn URL / LinkedIn
 *   Job Title / Title / Current Title
 *   Company / Current Company / Organization
 *   Location / City
 *   Skills                  (comma-separated, optional)
 *   Seniority               (optional — overrides title-inferred level)
 *   GitHub URL / GitHub     (optional)
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields, commas inside quotes
// ---------------------------------------------------------------------------

function parseCSV(raw: string): Record<string, string>[] {
  // Character-by-character parser — correctly handles newlines inside quoted fields
  const records: string[][] = []
  let current: string[] = []
  let field = ""
  let inQuote = false

  const src = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === '"') {
      if (inQuote && src[i + 1] === '"') {
        field += '"'
        i++
      } else {
        inQuote = !inQuote
      }
    } else if (ch === "," && !inQuote) {
      current.push(field)
      field = ""
    } else if (ch === "\n" && !inQuote) {
      current.push(field)
      field = ""
      if (current.some((f) => f.trim())) records.push(current)
      current = []
    } else {
      field += ch
    }
  }
  // flush last field/record
  current.push(field)
  if (current.some((f) => f.trim())) records.push(current)

  if (records.length < 2) return []

  const headers = records[0].map((h) => h.replace(/^"|"$/g, "").trim())
  return records.slice(1).map((values) => {
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").replace(/^"|"$/g, "").trim()
    })
    return row
  })
}

// ---------------------------------------------------------------------------
// Column name resolution (case-insensitive, multiple aliases)
// ---------------------------------------------------------------------------

function pick(row: Record<string, string>, ...keys: string[]): string {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]))
  for (const key of keys) {
    const val = lower[key.toLowerCase()]
    if (val) return val
  }
  return ""
}

// ---------------------------------------------------------------------------
// Inference helpers
// ---------------------------------------------------------------------------

const LEVEL_PATTERNS: Array<[RegExp, string]> = [
  [/\b(staff|principal)\b/i, "senior"],
  [/\bsenior\b/i, "senior"],
  [/\bjunior\b/i, "entry"],
  [/\b(intern|trainee|apprentice)\b/i, "training"],
  [/\b(vp|vice president)\b/i, "vp"],
  [/\bdirector\b/i, "director"],
  [/\bmanager\b/i, "manager"],
  [/\b(cto|ceo|coo|cpo|ciso|chief)\b/i, "cxo"],
]

function inferLevels(title: string, seniority: string): string[] {
  if (seniority) {
    const s = seniority.toLowerCase().trim()
    const map: Record<string, string> = {
      senior: "senior",
      "senior+": "senior",
      mid: "senior",
      junior: "entry",
      intern: "training",
      manager: "manager",
      director: "director",
      vp: "vp",
      executive: "cxo",
      cxo: "cxo",
    }
    if (map[s]) return [map[s]]
  }
  for (const [re, level] of LEVEL_PATTERNS) {
    if (re.test(title)) return [level]
  }
  return []
}

const SUBROLE_PATTERNS: Array<[RegExp, string]> = [
  [/\bfrontend\b|\bfront-end\b|\bfront end\b/i, "frontend"],
  [/\bbackend\b|\bback-end\b|\bback end\b/i, "backend"],
  [/\bfull.?stack\b/i, "full stack"],
  [/\bdevops\b|\bsre\b|\bsite reliability\b/i, "devops"],
  [/\bmachine learning\b|\b\bml engineer\b/i, "machine learning"],
  [/\bdata engineer\b|\bdata platform\b/i, "data"],
  [/\bmobile\b|\bios\b|\bandroid\b/i, "mobile"],
  [/\bsecurity\b/i, "security"],
  [/\b(platform|infrastructure|infra)\b/i, "platform"],
  [/\bcloud\b/i, "cloud"],
  [/\bembedded\b/i, "embedded"],
  [/\bnetwork\b/i, "network"],
  [/\bqa\b|\bquality assurance\b|\btest engineer\b/i, "qa"],
  [/\bresearch\b/i, "research"],
]

function inferSubRole(title: string): string {
  for (const [re, role] of SUBROLE_PATTERNS) {
    if (re.test(title)) return role
  }
  return "software"
}

function inferRole(title: string): string {
  const t = title.toLowerCase()
  if (/\b(engineer|developer|programmer|architect|devops|sre)\b/.test(t)) return "engineering"
  if (/\bdesign(er)?\b/.test(t)) return "design"
  if (/\bproduct\b/.test(t)) return "product"
  if (/\bdata\b/.test(t)) return "data"
  if (/\bmarketing\b/.test(t)) return "marketing"
  if (/\bsales\b/.test(t)) return "sales"
  return "engineering"
}

// ---------------------------------------------------------------------------
// Row → pool person
// ---------------------------------------------------------------------------

interface PoolPerson {
  name: string
  linkedinUrl?: string
  currentTitle?: string
  currentCompany?: string
  location?: string
  skills?: string[]
  jobTitleLevels?: string[]
  jobTitleSubRole?: string
  jobTitleRole?: string
  githubUrl?: string
}

function rowToPerson(row: Record<string, string>): PoolPerson | null {
  const name = pick(row, "full name", "name", "full_name")
  if (!name) return null

  const title = pick(row, "job title", "title", "current title", "current_title", "job_title")
  const company = pick(row, "company", "company name", "current company", "organization", "current_company")
  const location = pick(row, "location", "city", "location_name")
  const linkedin = pick(row, "linkedin url", "linkedin profile", "linkedin", "linkedin_url")
  const github = pick(row, "github url", "github", "github_url")
  const skillsRaw = pick(row, "skills", "skill")
  const seniority = pick(row, "seniority", "level")

  // Extract skills from the Headline field (pipe-separated tech keywords)
  const headline = pick(row, "headline")
  const headlineSkills = headline
    ? headline
        .split(/\s*\|\s*/)
        .flatMap((chunk) => chunk.split(/\s*,\s*/))
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0 && s.length < 40 && !/^(former|ex-|head of|senior |junior )/i.test(s))
    : []

  const rawSkills = skillsRaw
    ? skillsRaw.split(/[,;|]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
    : []

  const allSkills = [...new Set([...rawSkills, ...headlineSkills])]
  const skills = allSkills.length > 0 ? allSkills : undefined

  const jobTitleLevels = title ? inferLevels(title, seniority) : []
  const jobTitleSubRole = title ? inferSubRole(title) : undefined
  const jobTitleRole = title ? inferRole(title) : undefined

  return {
    name,
    linkedinUrl: linkedin || undefined,
    currentTitle: title || undefined,
    currentCompany: company || undefined,
    location: location || undefined,
    skills: skills && skills.length > 0 ? skills : undefined,
    jobTitleLevels: jobTitleLevels.length > 0 ? jobTitleLevels : undefined,
    jobTitleSubRole,
    jobTitleRole,
    githubUrl: github || undefined,
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find((a) => !a.startsWith("--"))
  const replace = args.includes("--replace")

  if (!filePath) {
    console.error("Usage: bun scripts/import-pool.ts <path/to/export.csv> [--replace]")
    process.exit(1)
  }

  const siteUrl = process.env.CONVEX_SITE_URL
  if (!siteUrl) {
    console.error(
      "CONVEX_SITE_URL is not set.\n" +
        "Find it in the Convex dashboard → Settings → URL & Deploy Key,\n" +
        'or run: export CONVEX_SITE_URL="https://your-deployment.convex.site"',
    )
    process.exit(1)
  }

  const raw = readFileSync(resolve(filePath), "utf-8")
  const rows = parseCSV(raw)
  console.log(`Parsed ${rows.length} rows from ${filePath}`)

  const people: PoolPerson[] = rows.map(rowToPerson).filter((p): p is PoolPerson => p !== null)
  console.log(`Valid people: ${people.length} (${rows.length - people.length} skipped — no name)`)

  const endpoint = `${siteUrl.replace(/\/$/, "")}/import-pool`
  console.log(`\nPosting to ${endpoint} (replace=${replace})...`)

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ people, replace }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`HTTP ${res.status}: ${text}`)
    process.exit(1)
  }

  const result = await res.json() as { ok: boolean; inserted: number }
  console.log(`\nDone! Inserted ${result.inserted} people into the candidate pool.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
