export type InfoSourceId =
  | "linkedin"
  | "github"
  | "x"
  | "website"
  | "reddit"
  | "youtube";

const ORDER: readonly InfoSourceId[] = [
  "linkedin",
  "github",
  "x",
  "youtube",
  "reddit",
  "website",
];

type EvidenceKind = "repo" | "blog" | "talk" | "community" | "employment" | "network";

type EvidenceRow = { kind: EvidenceKind; url?: string };

type CandidateRow = {
  profileUrl?: string;
  socialGithub?: string;
  socialBlog?: string;
  socialTwitter?: string;
};

function normalizeToUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) {
    return;
  }
  if (t.startsWith("http://") || t.startsWith("https://")) {
    return t;
  }
  if (!t.includes(" ") && (t.includes("/") || t.includes("."))) {
    return `https://${t.replace(/^\/+/, "")}`;
  }
  return;
}

function addFromUrl(url: string | undefined, into: Set<InfoSourceId>) {
  if (!url?.trim()) {
    return;
  }
  const u = url.toLowerCase();
  if (u.includes("linkedin.")) {
    into.add("linkedin");
  }
  if (u.includes("github.com") || u.includes("github.io")) {
    into.add("github");
  }
  if (u.includes("twitter.com") || u.includes("x.com")) {
    into.add("x");
  }
  if (u.includes("reddit.com") || u.includes("redd.it")) {
    into.add("reddit");
  }
  if (u.includes("youtube.com") || u.includes("youtu.be")) {
    into.add("youtube");
  }
}

export function deriveInfoSources(
  candidate: CandidateRow,
  evidence: EvidenceRow[],
): InfoSourceId[] {
  const into = new Set<InfoSourceId>();

  addFromUrl(candidate.profileUrl, into);
  const profile = candidate.profileUrl?.toLowerCase() ?? "";
  if (
    profile.startsWith("http") &&
    !profile.includes("linkedin.") &&
    !profile.includes("github.com") &&
    !profile.includes("twitter.com") &&
    !profile.includes("x.com")
  ) {
    into.add("website");
  }

  if (candidate.socialGithub?.trim()) {
    addFromUrl(normalizeToUrl(candidate.socialGithub), into);
    into.add("github");
  }
  if (candidate.socialTwitter?.trim()) {
    addFromUrl(normalizeToUrl(candidate.socialTwitter), into);
    into.add("x");
  }
  if (candidate.socialBlog?.trim()) {
    addFromUrl(normalizeToUrl(candidate.socialBlog), into);
    into.add("website");
  }

  for (const row of evidence) {
    addFromUrl(row.url, into);
    const u = row.url?.toLowerCase() ?? "";
    switch (row.kind) {
      case "repo":
        into.add("github");
        break;
      case "blog":
        if (!u.includes("reddit")) {
          into.add("website");
        }
        break;
      case "talk":
        if (!u.includes("youtube") && !u.includes("youtu.be")) {
          into.add("website");
        }
        break;
      case "community":
        if (u.includes("reddit") || u.includes("redd.it")) {
          into.add("reddit");
        } else if (row.url?.trim()) {
          into.add("website");
        }
        break;
      case "employment":
        if (row.url?.trim()) {
          if (
            !u.includes("linkedin.") &&
            !u.includes("github.com") &&
            !u.includes("twitter.com") &&
            !u.includes("x.com") &&
            !u.includes("reddit.com") &&
            !u.includes("redd.it") &&
            !u.includes("youtube.com") &&
            !u.includes("youtu.be")
          ) {
            into.add("website");
          }
        } else {
          into.add("linkedin");
        }
        break;
      default:
        break;
    }
  }

  return ORDER.filter((id) => into.has(id));
}
