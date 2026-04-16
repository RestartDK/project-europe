/** Mirrors `deriveInfoSources` in convex/lib/infoSources.ts */
export type InfoSourceId =
  | "linkedin"
  | "github"
  | "x"
  | "website"
  | "reddit"
  | "youtube";

/** Evidence row: URL-aware when possible, else inferred from Convex `kind`. */
export type DossierEvidenceSourceId =
  | InfoSourceId
  | "employment"
  | "community"
  | "talk"
  | "network";

export function deriveDossierEvidenceSource(
  url: string | undefined,
  kind: "repo" | "blog" | "talk" | "community" | "employment" | "network",
): DossierEvidenceSourceId {
  const u = (url ?? "").toLowerCase();
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("github.com")) return "github";
  if (u.includes("reddit.com")) return "reddit";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("twitter.com") || u.includes("x.com")) return "x";
  if (kind === "repo") return "github";
  if (kind === "employment") return "employment";
  if (kind === "community") return "community";
  if (kind === "talk") return "talk";
  if (kind === "network") return "network";
  return "website";
}
