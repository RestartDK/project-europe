/**
 * Dev-only test action — runs the full PDL pipeline and returns results
 * directly without writing to the database.
 */
import { v } from "convex/values";
import { action } from "./_generated/server";
import { normalise, buildQuery, scorePdlPerson, searchPdl } from "./lib/pdl";

export const testPDL = action({
  args: {
    company: v.string(),
    lookingFor: v.string(),
    chips: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const schema = await normalise(args.company, args.lookingFor, args.chips);
    const query = buildQuery(schema);

    console.log("\n=== NORMALISED SCHEMA ===");
    console.log(JSON.stringify(schema, null, 2));
    console.log("\n=== PDL QUERY ===");
    console.log(JSON.stringify(query, null, 2));

    const pdlApiKey = process.env.PDL_API_KEY;
    if (!pdlApiKey) throw new Error("PDL_API_KEY is not set");

    const { people, total } = await searchPdl(pdlApiKey, query, 50);

    const ranked = people
      .map((p) => ({ person: p, pdlScore: scorePdlPerson(p, schema) }))
      .sort((a, b) => b.pdlScore - a.pdlScore)
      .slice(0, 25);

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
    }));

    console.log("\n=== RESULTS (" + people.length + " from PDL -> top " + results.length + " after scoring) ===");
    for (const r of results) {
      console.log("[" + r.pdlScore + "] " + r.name + " — " + r.title + " @ " + r.company);
    }

    return { schema, query, total, results };
  },
});
