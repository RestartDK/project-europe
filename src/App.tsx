import { useState } from "react"
import type { Id } from "../convex/_generated/dataModel"
import { SearchInput } from "./components/SearchInput"
import { CandidateList } from "./components/CandidateList"

export function App() {
  const [currentSearchId, setCurrentSearchId] = useState<Id<"searches"> | null>(null)

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Talent Search</h1>
        <p className="text-sm text-muted-foreground">
          Describe who you're looking for in plain English.
        </p>
      </div>

      <SearchInput onSearchStart={setCurrentSearchId} />

      {currentSearchId && <CandidateList searchId={currentSearchId} />}
    </div>
  )
}

export default App
