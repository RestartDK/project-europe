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
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  )

  const handleDiscoveryComplete = useCallback(() => setScreen("results"), [])

  return (
    <div className="min-h-svh bg-background">
      <TalentThemeToggle />
      {screen === "context" && (
        <ContextScreen onStartDiscovery={() => setScreen("discovery")} />
      )}
      {screen === "discovery" && (
        <DiscoveryScreen onComplete={handleDiscoveryComplete} />
      )}
      {screen === "results" && (
        <ResultsScreen
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
