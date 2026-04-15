import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { CandidateCard } from "./CandidateCard"

interface CandidateListProps {
  searchId: Id<"searches">
}

export function CandidateList({ searchId }: CandidateListProps) {
  const search = useQuery(api.searches.getSearch, { searchId })
  const candidates = useQuery(api.candidates.getCandidatesForSearch, { searchId })

  if (candidates === undefined || search === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted" />
        ))}
      </div>
    )
  }

  if (candidates.length === 0) {
    if (search?.status === "complete") {
      return (
        <p className="text-center text-sm text-muted-foreground">
          No candidates found. Try broadening your search.
        </p>
      )
    }
    return (
      <p className="text-center text-sm text-muted-foreground">
        Searching Apollo…
      </p>
    )
  }

  const enrichedCount = candidates.filter((c) => c.enriched).length

  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} found
        </span>
        {search?.status === "enriching" && (
          <span>
            Enriching… {enrichedCount}/{candidates.length}
          </span>
        )}
        {search?.status === "complete" && (
          <span className="text-green-600">All enriched</span>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {candidates.map((candidate) => (
          <CandidateCard key={candidate._id} candidate={candidate} />
        ))}
      </div>
    </div>
  )
}
