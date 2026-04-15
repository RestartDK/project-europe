import { useAction, useMutation, useQuery } from "convex/react"
import { useEffect, useState } from "react"

import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"

type SearchResultRow = {
  scoreId: Id<"candidateScores">
  candidateId: Id<"candidates">
  rank: number
  finalScore: number
  baseScore: number
  confidence: number
  summaryWhy: string
  fullName: string
  headline: string
  currentCompany?: string
  location?: string
  stacks: string[]
  profileUrl?: string
}

type SearchResults = {
  requestId: Id<"searchRequests">
  rawPrompt: string
  companyContext?: string
  criteriaJson: string
  status: string
  promptVersion: string
  rankingVersion?: string
  latestRankingRunId?: Id<"rankingRuns">
  rankingNotes?: string
  errorMessage?: string
  results: SearchResultRow[]
}

type CandidateDossier = {
  scoreId: Id<"candidateScores">
  candidateId: Id<"candidates">
  rank: number
  finalScore: number
  baseScore: number
  confidence: number
  summaryWhy: string
  topStrengths: string[]
  risksOrGaps: string[]
  factorBreakdown: {
    roleFit: number
    stackFit: number
    domainFit: number
    evidenceStrength: number
    recency: number
    signalConfidence: number
    reachabilityBonus: number
  }
  candidate: {
    fullName: string
    headline: string
    summary: string
    currentCompany?: string
    location?: string
    profileUrl?: string
    email?: string
    warmIntroPath?: string
    yearsExperience: number
    seniority: string
    stacks: string[]
    domains: string[]
  }
  evidence: Array<{
    evidenceId: Id<"candidateEvidence">
    title: string
    kind: "repo" | "blog" | "talk" | "community" | "employment" | "network"
    snippet: string
    url?: string
    tags: string[]
    strength: number
    recencyYears: number
  }>
  feedback: Array<{
    feedbackId: Id<"rankingFeedback">
    disposition: "thumbs_up" | "thumbs_down" | "hide" | "promote"
    note?: string
  }>
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "ranked"
      ? "bg-primary/10 text-primary"
      : status === "error"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground"

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${styles}`}>
      {status.replaceAll("_", " ")}
    </span>
  )
}

function ScoreBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export function App() {
  const extractSearchCriteria = useAction(api.intake.extractSearchCriteria)
  const submitFeedback = useMutation(api.ranking.submitFeedback)

  const [companyContext, setCompanyContext] = useState("")
  const [prompt, setPrompt] = useState("")
  const [activeRequestId, setActiveRequestId] = useState<Id<"searchRequests"> | null>(null)
  const [selectedScoreId, setSelectedScoreId] = useState<Id<"candidateScores"> | null>(null)
  const [criteriaJson, setCriteriaJson] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const searchResults = useQuery(
    api.ranking.getSearchResults,
    activeRequestId ? { requestId: activeRequestId } : {},
  ) as SearchResults | null | undefined
  const selectedCandidate = useQuery(
    api.ranking.getCandidateDossier,
    selectedScoreId ? { scoreId: selectedScoreId } : "skip",
  ) as CandidateDossier | null | undefined

  useEffect(() => {
    if (!searchResults?.results.length) {
      setSelectedScoreId(null)
      return
    }

    const stillSelected = searchResults.results.some(
      (result: SearchResultRow) => result.scoreId === selectedScoreId,
    )

    if (!stillSelected) {
      setSelectedScoreId(searchResults.results[0]?.scoreId ?? null)
    }
  }, [searchResults?.results, selectedScoreId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFeedbackMessage(null)
    setCriteriaJson(null)
    setIsSubmitting(true)
    try {
      const result = await extractSearchCriteria({
        prompt,
        companyContext: companyContext.trim() || undefined,
      })
      setActiveRequestId(result.requestId)
      setCriteriaJson(result.criteriaJson)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onFeedback(disposition: "thumbs_up" | "thumbs_down" | "promote" | "hide") {
    if (!searchResults || !selectedCandidate) {
      return
    }

    setFeedbackMessage(null)
    await submitFeedback({
      requestId: searchResults.requestId,
      scoreId: selectedCandidate.scoreId,
      disposition,
    })
    setFeedbackMessage(`Saved feedback: ${disposition.replaceAll("_", " ")}`)
  }

  return (
    <div className="min-h-svh bg-background p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
          <section className="rounded-2xl border bg-card p-6 text-sm shadow-sm">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">
                Rank candidates from Clay with explainable scores
              </h1>
              <p className="text-muted-foreground">
                Submit a hiring prompt, seed the fixture dataset, and inspect a
                ranked table plus a dossier that explains why someone earned
                their position.
              </p>
            </div>

            <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Company context
                </span>
                <textarea
                  className="min-h-[96px] rounded-lg border bg-background px-3 py-2 text-sm"
                  value={companyContext}
                  onChange={(e) => setCompanyContext(e.target.value)}
                  placeholder="What does your company do, and why is this hire important?"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Candidate prompt
                </span>
                <textarea
                  required
                  className="min-h-[140px] rounded-lg border bg-background px-3 py-2 text-sm"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Staff or senior engineer with React, TypeScript, developer tools, and realtime collaboration experience..."
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSubmitting || !prompt.trim()}>
                  {isSubmitting ? "Ranking seeded candidates..." : "Run ranking"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCompanyContext(
                      "We are building a product that finds and ranks exceptional developers from verifiable work and warm-network context.",
                    )
                    setPrompt(
                      "Staff or senior engineer with React, TypeScript, developer tools, and realtime collaboration experience. Open source and product taste are both important.",
                    )
                  }}
                >
                  Use example prompt
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="mt-5 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-3">
                Seed data lives in <code>candidates.json</code>.
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                Eval fixtures live in <code>ranking-evals.json</code>.
              </div>
            </div>

            {(criteriaJson ?? searchResults?.criteriaJson) && (
              <details className="mt-5 rounded-xl border bg-muted/20 p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Structured search criteria
                </summary>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-mono text-xs leading-6">
                  {criteriaJson ?? searchResults?.criteriaJson}
                </pre>
              </details>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-6 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ranked candidates</h2>
                <p className="text-muted-foreground">
                  Minimal table view with score, rationale, and a detail panel.
                </p>
              </div>
              {searchResults && <StatusBadge status={searchResults.status} />}
            </div>

            {searchResults?.rankingNotes && (
              <div className="mt-4 rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {searchResults.rankingNotes}
              </div>
            )}

            {!searchResults && (
              <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Run a search to seed the candidate fixture and render ranked
                results.
              </div>
            )}

            {searchResults && (
              <div className="mt-6 overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[80px_minmax(0,1.3fr)_110px_minmax(0,1.4fr)_120px] border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
                  <div>Rank</div>
                  <div>Candidate</div>
                  <div>Score</div>
                  <div>Why</div>
                  <div />
                </div>

                {searchResults.results.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-muted-foreground">
                    No candidate scores yet.
                  </div>
                ) : (
                  searchResults.results.map((result: SearchResultRow) => {
                    const isSelected = result.scoreId === selectedScoreId

                    return (
                      <div
                        key={result.scoreId}
                        className={`grid grid-cols-[80px_minmax(0,1.3fr)_110px_minmax(0,1.4fr)_120px] gap-3 border-b px-4 py-4 text-sm last:border-b-0 ${
                          isSelected ? "bg-muted/20" : ""
                        }`}
                      >
                        <div className="font-semibold">#{result.rank}</div>
                        <div className="min-w-0 space-y-1">
                          <div className="truncate font-medium">
                            {result.fullName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {result.headline}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {[result.currentCompany, result.location]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {Math.round(result.finalScore)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Conf. {Math.round(result.confidence)}
                          </div>
                        </div>
                        <div className="line-clamp-3 text-sm text-muted-foreground">
                          {result.summaryWhy}
                        </div>
                        <div className="flex items-start justify-end">
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedScoreId(result.scoreId)}
                          >
                            See more
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border bg-card p-6 text-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Candidate dossier</h2>
              <p className="text-muted-foreground">
                This is the side-panel equivalent for explaining rank, strengths,
                gaps, and cited evidence.
              </p>
            </div>
            {selectedCandidate && (
              <div className="text-sm font-medium">
                Rank #{selectedCandidate.rank} ·{" "}
                {Math.round(selectedCandidate.finalScore)}
              </div>
            )}
          </div>

          {!selectedCandidate && (
            <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Pick a ranked candidate to inspect the explanation trail.
            </div>
          )}

          {selectedCandidate && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-lg font-semibold">
                    {selectedCandidate.candidate.fullName}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedCandidate.candidate.headline}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {[selectedCandidate.candidate.currentCompany, selectedCandidate.candidate.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <p className="mt-4 leading-6">{selectedCandidate.candidate.summary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <h3 className="font-medium">Why this rank</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {selectedCandidate.summaryWhy}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-1">
                        Base {Math.round(selectedCandidate.baseScore)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-1">
                        Final {Math.round(selectedCandidate.finalScore)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-1">
                        Confidence {Math.round(selectedCandidate.confidence)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <h3 className="font-medium">Warm intro & reachability</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {selectedCandidate.candidate.warmIntroPath ??
                        "No warm path surfaced in the current stub data."}
                    </p>
                    {selectedCandidate.candidate.email && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Contact: {selectedCandidate.candidate.email}
                      </div>
                    )}
                    {selectedCandidate.candidate.profileUrl && (
                      <a
                        className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                        href={selectedCandidate.candidate.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open profile
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <h3 className="font-medium">Top strengths</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {selectedCandidate.topStrengths.map((item: string) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border p-4">
                    <h3 className="font-medium">Risks or gaps</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {selectedCandidate.risksOrGaps.length > 0 ? (
                        selectedCandidate.risksOrGaps.map((item: string) => (
                          <li key={item}>• {item}</li>
                        ))
                      ) : (
                        <li>• No major gaps surfaced in this stub ranking run.</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="font-medium">Cited evidence</h3>
                  <div className="mt-4 grid gap-3">
                    {selectedCandidate.evidence.map((item: CandidateDossier["evidence"][number]) => (
                      <div key={item.evidenceId} className="rounded-xl border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {item.kind}
                          </span>
                          <span className="text-sm font-medium">{item.title}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {item.snippet}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-full bg-background px-2 py-1">
                            Strength {Math.round(item.strength * 100)}
                          </span>
                          <span className="rounded-full bg-background px-2 py-1">
                            {item.recencyYears.toFixed(1)}y ago
                          </span>
                          {item.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="rounded-full bg-background px-2 py-1">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {item.url && (
                          <a
                            className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open evidence
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border p-4">
                  <h3 className="font-medium">Factor breakdown</h3>
                  <div className="mt-4 space-y-3">
                    <ScoreBar
                      label="Role fit"
                      value={selectedCandidate.factorBreakdown.roleFit}
                    />
                    <ScoreBar
                      label="Stack fit"
                      value={selectedCandidate.factorBreakdown.stackFit}
                    />
                    <ScoreBar
                      label="Domain fit"
                      value={selectedCandidate.factorBreakdown.domainFit}
                    />
                    <ScoreBar
                      label="Evidence strength"
                      value={selectedCandidate.factorBreakdown.evidenceStrength}
                    />
                    <ScoreBar
                      label="Recency"
                      value={selectedCandidate.factorBreakdown.recency}
                    />
                    <ScoreBar
                      label="Signal confidence"
                      value={selectedCandidate.factorBreakdown.signalConfidence}
                    />
                    <ScoreBar
                      label="Reachability"
                      value={selectedCandidate.factorBreakdown.reachabilityBonus}
                    />
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="font-medium">Recruiter feedback</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void onFeedback("thumbs_up")}>
                      Thumbs up
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void onFeedback("thumbs_down")}>
                      Thumbs down
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void onFeedback("promote")}>
                      Promote
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void onFeedback("hide")}>
                      Hide
                    </Button>
                  </div>
                  {feedbackMessage && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      {feedbackMessage}
                    </div>
                  )}
                  {selectedCandidate.feedback.length > 0 && (
                    <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                      {selectedCandidate.feedback.map((item: CandidateDossier["feedback"][number]) => (
                        <div key={item.feedbackId} className="rounded-lg border bg-muted/20 px-3 py-2">
                          {item.disposition.replaceAll("_", " ")}
                          {item.note ? ` · ${item.note}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <h3 className="font-medium">Current search</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {searchResults?.rawPrompt}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
