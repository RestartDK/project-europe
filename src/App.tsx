import { useAction, useQuery } from "convex/react"
import { useCallback, useMemo, useState } from "react"

import { ContextScreen } from "@/components/talent-compass/context-screen"
import { DiscoveryScreen } from "@/components/talent-compass/discovery-screen"
import { DossierScreen } from "@/components/talent-compass/dossier-screen"
import { ResultsScreen } from "@/components/talent-compass/results-screen"
import { TalentThemeToggle } from "@/components/talent-compass/theme-toggle"
import { Button } from "@/components/ui/button"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"

type Screen = "context" | "discovery" | "results" | "dossier"

export function App() {
  const [screen, setScreen] = useState<Screen>("context")
  const [contextStep, setContextStep] = useState<1 | 2>(1)
  const [company, setCompany] = useState("")
  const [lookingFor, setLookingFor] = useState("")
  const [activeRequestId, setActiveRequestId] = useState<Id<"searchRequests"> | null>(null)
  const [selectedScoreId, setSelectedScoreId] = useState<Id<"candidateScores"> | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const extractSearchCriteria = useAction(api.intake.extractSearchCriteria)

  const searchResults = useQuery(
    api.ranking.getSearchResults,
    activeRequestId ? { requestId: activeRequestId } : "skip",
  )

  const dossier = useQuery(
    api.ranking.getCandidateDossier,
    selectedScoreId ? { scoreId: selectedScoreId } : "skip",
  )

  const discoveryStatus = searchResults?.status ?? "pending"
  const discoveryErrorMessage = searchResults?.errorMessage

  const effectiveScreen: Screen = (() => {
    if (screen === "discovery") {
      if (discoveryStatus === "ranked") return "results"
      if (discoveryStatus === "error") return "context"
    }
    return screen
  })()

  const effectiveContextStep: 1 | 2 =
    screen === "discovery" && discoveryStatus === "error" ? 2 : contextStep

  const effectiveContextError =
    submitError ??
    (screen === "discovery" && discoveryStatus === "error"
      ? discoveryErrorMessage ?? "Ranking failed"
      : null)

  const goToDiscovery = useCallback(async () => {
    setSubmitError(null)
    setSelectedScoreId(null)

    const prompt = lookingFor.trim()
    if (!prompt) {
      return
    }

    setScreen("discovery")

    try {
      const result = await extractSearchCriteria({
        prompt,
        companyContext: company.trim() || undefined,
      })
      setActiveRequestId(result.requestId)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
      setScreen("context")
      setContextStep(2)
    }
  }, [company, lookingFor, extractSearchCriteria])

  const backFromDiscovery = useCallback(() => {
    setScreen("context")
    setContextStep(2)
  }, [])

  const backToCriteriaFromResults = useCallback(() => {
    setScreen("context")
    setContextStep(2)
  }, [])

  const backFromDiscoveryWithError = useCallback(() => {
    setSubmitError(searchResults?.errorMessage ?? submitError)
    backFromDiscovery()
  }, [backFromDiscovery, searchResults?.errorMessage, submitError])

  const headerBack = useMemo(() => {
    if (effectiveScreen === "context" && effectiveContextStep === 2) {
      return { label: "← back", onClick: () => setContextStep(1) } as const
    }
    if (effectiveScreen === "discovery") {
      return { label: "← edit criteria", onClick: backFromDiscoveryWithError } as const
    }
    if (effectiveScreen === "results") {
      return { label: "← edit criteria", onClick: backToCriteriaFromResults } as const
    }
    if (effectiveScreen === "dossier") {
      return { label: "← back", onClick: () => setScreen("results") } as const
    }
    return null
  }, [
    backFromDiscoveryWithError,
    backToCriteriaFromResults,
    effectiveContextStep,
    effectiveScreen,
  ])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          {headerBack ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 justify-start rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={headerBack.onClick}
            >
              {headerBack.label}
            </Button>
          ) : null}
        </div>
        <TalentThemeToggle />
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
      {effectiveScreen === "context" && (
        <ContextScreen
          step={effectiveContextStep}
          onStepChange={setContextStep}
          company={company}
          onCompanyChange={setCompany}
          lookingFor={lookingFor}
          onLookingForChange={setLookingFor}
          onStartDiscovery={goToDiscovery}
          errorMessage={effectiveContextError}
        />
      )}
      {effectiveScreen === "discovery" && (
        <DiscoveryScreen
          status={discoveryStatus}
          errorMessage={discoveryErrorMessage}
          rankingNotes={searchResults?.rankingNotes}
        />
      )}
      {effectiveScreen === "results" && (
        <ResultsScreen
          results={searchResults?.results ?? []}
          onSelectScore={(scoreId) => {
            setSelectedScoreId(scoreId)
            setScreen("dossier")
          }}
        />
      )}
      {effectiveScreen === "dossier" && (
        <DossierScreen dossier={dossier} />
      )}
      </main>
    </div>
  )
}

export default App
