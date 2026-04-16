import type { Id } from "../../../convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"
import { InfoSourceIcons } from "./info-source-icons"

type SearchResults = FunctionReturnType<typeof api.ranking.getSearchResults>
type ResultRow = NonNullable<SearchResults>["results"][number]
type EnrichmentSummary = NonNullable<SearchResults>["enrichmentSummary"]

type Props = {
  enrichmentSummary?: EnrichmentSummary
  onSelectScore: (scoreId: Id<"candidateScores">) => void
  results: ResultRow[]
}

const rowCn = cn(
  "cursor-pointer border-b border-border transition-colors last:border-b-0",
  "hover:bg-secondary/40"
)

const headCn =
  "h-auto px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground"

const rankColWidth = "w-10 min-w-10"

/** Opaque 1px “border” for sticky columns — avoids scroll bleed through translucent `border-border` (esp. dark). */
const stickyHeadEdge =
  "shadow-[1px_0_0_0_color-mix(in_oklch,var(--foreground),var(--secondary)_88%)]"
const stickyBodyEdge =
  "shadow-[1px_0_0_0_color-mix(in_oklch,var(--foreground),var(--background)_88%)]"
const stickyBodyEdgeHover =
  "group-hover:shadow-[1px_0_0_0_color-mix(in_oklch,var(--foreground),var(--secondary)_88%)]"

const stickyRankHead = cn(
  headCn,
  rankColWidth,
  "sticky left-0 z-20 bg-secondary text-center tabular-nums",
  stickyHeadEdge
)
const stickyRankCell = cn(
  "px-2 py-2.5 text-center",
  rankColWidth,
  "sticky left-0 z-20 bg-background text-xs font-medium text-muted-foreground tabular-nums group-hover:bg-secondary",
  stickyBodyEdge,
  stickyBodyEdgeHover
)

const stickyCandidateHead = cn(
  headCn,
  "sticky left-10 z-30 bg-secondary",
  stickyHeadEdge
)
const stickyCandidateCell = cn(
  "px-4 py-2.5",
  "sticky left-10 z-30 bg-background group-hover:bg-secondary",
  stickyBodyEdge,
  stickyBodyEdgeHover
)

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`
}

function MatchBar({ score }: { score: number }) {
  const indicatorClass =
    score >= 85
      ? "[&_[data-slot=progress-indicator]]:bg-[var(--success)]"
      : score >= 70
        ? "[&_[data-slot=progress-indicator]]:bg-[var(--warning)]"
        : "[&_[data-slot=progress-indicator]]:bg-muted-foreground"
  return (
    <div className="flex min-w-[110px] items-center gap-2">
      <Progress
        value={score}
        className={cn("h-1.5 flex-1 bg-secondary", indicatorClass)}
      />
      <span className="w-6 text-right text-[11px] font-medium text-foreground tabular-nums">
        {score}
      </span>
    </div>
  )
}

function enrichmentCopy(status: ResultRow["enrichmentStatus"]) {
  switch (status) {
    case "ready":
      return "ready now"
    case "queued":
      return "getting from clay"
    case "complete":
      return "updated"
    case "failed":
      return "retry needed"
  }
}

function enrichmentBadgeCn(status: ResultRow["enrichmentStatus"]) {
  switch (status) {
    case "ready":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "queued":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "complete":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
    case "failed":
      return "border-destructive/30 bg-destructive/10 text-destructive"
  }
}

function enrichmentSummaryCopy(summary?: EnrichmentSummary) {
  if (!summary) {
    return null
  }

  const parts: string[] = []
  if (summary.ready > 0) {
    parts.push(`${summary.ready} ready now`)
  }
  if (summary.queued > 0) {
    parts.push(`${summary.queued} getting from clay`)
  }
  if (summary.complete > 0) {
    parts.push(`${summary.complete} updated`)
  }
  if (summary.failed > 0) {
    parts.push(`${summary.failed} need retry`)
  }

  return parts.join(" · ")
}

export function ResultsScreen({
  enrichmentSummary,
  onSelectScore,
  results,
}: Props) {
  const summary = enrichmentSummaryCopy(enrichmentSummary)

  return (
    <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <header className="mb-5 text-left">
          <h2 className="font-heading text-xl font-bold text-foreground">
            discovery results
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {results.length} candidates
          </p>
          {summary ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </header>

        <Card className="overflow-hidden rounded-2xl py-0 ring-1 ring-border">
          <Table className="min-w-max border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="border-b border-border bg-secondary hover:bg-secondary">
                <TableHead className={stickyRankHead}>#</TableHead>
                <TableHead className={stickyCandidateHead}>candidate</TableHead>
                <TableHead className={headCn}>match</TableHead>
                <TableHead className={headCn}>role</TableHead>
                <TableHead className={headCn}>company</TableHead>
                <TableHead className={headCn}>why</TableHead>
                <TableHead className={headCn}>sources</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow
                  key={r.scoreId}
                  onClick={() => onSelectScore(r.scoreId)}
                  className={cn(rowCn, "group")}
                >
                  <TableCell className={stickyRankCell}>{i + 1}</TableCell>
                  <TableCell className={stickyCandidateCell}>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-6 rounded-full">
                        <AvatarImage src={avatarUrl(r.slug)} alt={r.fullName} />
                        <AvatarFallback className="text-[10px]">
                          {r.fullName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <span className="block text-xs text-foreground group-hover:underline">
                          {r.fullName.toLowerCase()}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium tracking-wide uppercase",
                            enrichmentBadgeCn(r.enrichmentStatus)
                          )}
                        >
                          {enrichmentCopy(r.enrichmentStatus)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <MatchBar score={Math.round(r.finalScore)} />
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="text-xs text-foreground">
                      {r.headline.toLowerCase()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.stacks.slice(0, 3).join(" · ").toLowerCase()}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {r.companyLogoUrl && (
                        <Avatar className="size-3.5 rounded-full">
                          <AvatarImage
                            src={r.companyLogoUrl}
                            alt={r.currentCompany ?? ""}
                          />
                          <AvatarFallback className="text-[7px]">
                            {(r.currentCompany ?? "—").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {(r.currentCompany ?? "—").toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[min(280px,28vw)] px-4 py-2.5">
                    <p
                      className="truncate text-[11px] leading-snug text-foreground lowercase"
                      title={r.summaryWhy}
                    >
                      {r.summaryWhy.toLowerCase()}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <InfoSourceIcons sources={r.infoSources} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
