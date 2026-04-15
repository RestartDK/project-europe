import type { Doc } from "../../convex/_generated/dataModel"

interface CandidateCardProps {
  candidate: Doc<"talentCandidates">
}

function MovabilityBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-green-100 text-green-800"
      : score >= 5
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800"
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {score}/10
    </span>
  )
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{candidate.name}</h3>
            {candidate.enriched && candidate.movabilityScore !== undefined && (
              <MovabilityBadge score={candidate.movabilityScore} />
            )}
          </div>
          {(candidate.currentTitle || candidate.currentCompany) && (
            <p className="truncate text-sm text-muted-foreground">
              {[candidate.currentTitle, candidate.currentCompany]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {candidate.location && (
            <p className="text-xs text-muted-foreground">{candidate.location}</p>
          )}
        </div>

        {/* Links */}
        <div className="flex shrink-0 gap-2">
          {candidate.linkedinUrl && (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline-offset-2 hover:underline"
            >
              LinkedIn
            </a>
          )}
          {candidate.githubUrl && (
            <a
              href={candidate.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              GitHub
            </a>
          )}
        </div>
      </div>

      {/* Enriched content */}
      {candidate.enriched ? (
        <div className="flex flex-col gap-2">
          {candidate.accomplishmentSummary && (
            <p className="text-sm leading-relaxed">{candidate.accomplishmentSummary}</p>
          )}
          {candidate.movabilityReason && (
            <p className="text-xs text-muted-foreground italic">
              {candidate.movabilityReason}
            </p>
          )}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 w-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Enriching…</p>
        </div>
      )}
    </div>
  )
}
