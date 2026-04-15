import { useAction, useMutation, useQuery } from "convex/react"
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
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set())
  const [activeRequestId, setActiveRequestId] = useState<Id<"searchRequests"> | null>(null)
  const [selectedScoreId, setSelectedScoreId] = useState<Id<"candidateScores"> | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const extractSearchCriteria = useAction(api.intake.extractSearchCriteria)
  const submitFeedback = useMutation(api.ranking.submitFeedback)

  const searchResults = useQuery(
    api.ranking.getSearchResults,
    activeRequestId ? { requestId: activeRequestId } : "skip",
  )

  const dossier = useQuery(
    api.ranking.getCandidateDossier,
    selectedScoreId ? { scoreId: selectedScoreId } : "skip",
  )

  const discoveryStatus = searchResults?.status ?? "ready_for_clay"
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

  const composedPrompt = useMemo(() => {
    const chips = Array.from(selectedChips)
    const chipsSuffix =
      chips.length > 0 ? `\n\nConstraints:\n- ${chips.join("\n- ")}` : ""
    return `${lookingFor.trim()}${chipsSuffix}`.trim()
  }, [lookingFor, selectedChips])

  const toggleChip = useCallback((q: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev)
      if (next.has(q)) {
        next.delete(q)
      } else {
        next.add(q)
      }
      return next
    })
  }, [])

  const goToDiscovery = useCallback(async () => {
    setSubmitError(null)
    setSelectedScoreId(null)

    const prompt = composedPrompt
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
  }, [company, composedPrompt, extractSearchCriteria])

  const backFromDiscovery = useCallback(() => {
    setScreen("context")
    setContextStep(2)
  }, [])

  const backToCriteriaFromResults = useCallback(() => {
    setScreen("context")
    setContextStep(2)
  }, [])

  const onFeedback = useCallback(
    async (disposition: "thumbs_up" | "thumbs_down" | "promote" | "hide") => {
      if (!activeRequestId || !dossier) return
      await submitFeedback({
        requestId: activeRequestId,
        scoreId: dossier.scoreId,
        disposition,
      })
    },
    [activeRequestId, dossier, submitFeedback],
  )

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
    <div className="min-h-svh bg-background">
      {headerBack && (
        <Button
          type="button"
          variant="ghost"
          className="fixed left-4 top-4 z-40 h-8 justify-start rounded-full px-2 text-xs text-muted-foreground hover:text-foreground sm:left-6 sm:top-6"
          onClick={headerBack.onClick}
        >
          {headerBack.label}
        </Button>
      )}
      <TalentThemeToggle />

      {effectiveScreen === "context" && (
        <ContextScreen
          step={effectiveContextStep}
          onStepChange={setContextStep}
          company={company}
          onCompanyChange={setCompany}
          lookingFor={lookingFor}
          onLookingForChange={setLookingFor}
          selectedChips={selectedChips}
          onToggleChip={toggleChip}
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
        <DossierScreen dossier={dossier} onFeedback={onFeedback} />
      )}
    </div>
  )
}

export default App
