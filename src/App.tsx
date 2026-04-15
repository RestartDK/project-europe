import { useCallback, useState } from "react"

import { ContextScreen } from "@/components/talent-compass/context-screen"
import { DiscoveryScreen } from "@/components/talent-compass/discovery-screen"
import { DossierScreen } from "@/components/talent-compass/dossier-screen"
import { ResultsScreen } from "@/components/talent-compass/results-screen"
import { TalentThemeToggle } from "@/components/talent-compass/theme-toggle"
import type { Candidate } from "@/data/candidates"

type Screen = "context" | "discovery" | "results" | "dossier"

export function App() {
  const [screen, setScreen] = useState<Screen>("context")
  const [contextStep, setContextStep] = useState<1 | 2>(1)
  const [company, setCompany] = useState("")
  const [lookingFor, setLookingFor] = useState("")
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set())
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  )

  const handleDiscoveryComplete = useCallback(() => setScreen("results"), [])

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

  const goToDiscovery = useCallback(() => setScreen("discovery"), [])
  const backFromDiscovery = useCallback(() => {
    setScreen("context")
    setContextStep(2)
  }, [])

  const backToCriteriaFromResults = useCallback(() => {
    setScreen("context")
    setContextStep(2)
  }, [])

  return (
    <div className="min-h-svh bg-background">
      <TalentThemeToggle />
      {screen === "context" && (
        <ContextScreen
          step={contextStep}
          onStepChange={setContextStep}
          company={company}
          onCompanyChange={setCompany}
          lookingFor={lookingFor}
          onLookingForChange={setLookingFor}
          selectedChips={selectedChips}
          onToggleChip={toggleChip}
          onStartDiscovery={goToDiscovery}
        />
      )}
      {screen === "discovery" && (
        <DiscoveryScreen
          onBack={backFromDiscovery}
          onComplete={handleDiscoveryComplete}
        />
      )}
      {screen === "results" && (
        <ResultsScreen
          onEditCriteria={backToCriteriaFromResults}
          onSelectCandidate={(c) => {
            setSelectedCandidate(c)
            setScreen("dossier")
          }}
        />
      )}
      {screen === "dossier" && selectedCandidate && (
        <DossierScreen
          candidate={selectedCandidate}
          onBack={() => setScreen("results")}
        />
      )}
    </div>
  )
}

export default App
