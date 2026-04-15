import { useAction } from "convex/react"
import { useState } from "react"

import { api } from "../convex/_generated/api"

export function App() {
  const extractSearchCriteria = useAction(api.intake.extractSearchCriteria)

  const [companyContext, setCompanyContext] = useState("")
  const [prompt, setPrompt] = useState("")
  const [criteriaJson, setCriteriaJson] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCriteriaJson(null)
    setIsSubmitting(true)
    try {
      const result = await extractSearchCriteria({
        prompt,
        companyContext: companyContext.trim() || undefined,
      })
      setCriteriaJson(result.criteriaJson)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-xl min-w-0 flex-col gap-4 rounded-2xl border bg-card p-6 text-sm shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Who are you looking for?</h1>
          <p className="text-muted-foreground">
            Describe the role and constraints. We’ll turn it into structured JSON
            for a future Clay lookup.
          </p>
        </div>

        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Company context (optional)
            </span>
            <textarea
              className="min-h-[72px] rounded-md border bg-background px-3 py-2 text-sm"
              value={companyContext}
              onChange={(e) => setCompanyContext(e.target.value)}
              placeholder="What does your company do?"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Search
            </span>
            <textarea
              required
              className="min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Senior Convex + React engineer with realtime systems experience…"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? "Extracting…" : "Extract JSON"}
          </button>
        </form>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {criteriaJson && (
          <div className="rounded-xl border bg-muted/40 p-4 font-mono text-xs leading-6 whitespace-pre-wrap">
            {criteriaJson}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          This is the basic version: it extracts structured criteria and queues a
          stubbed Clay step.
        </p>
      </div>
    </div>
  )
}

export default App
