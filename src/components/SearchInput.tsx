import { useState } from "react"
import { useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

interface SearchInputProps {
  onSearchStart: (searchId: Id<"searches">) => void
}

export function SearchInput({ onSearchStart }: SearchInputProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const runSearch = useAction(api.searchAction.search)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)
    try {
      const searchId = await runSearch({ query: query.trim() })
      onSearchStart(searchId)
      setQuery("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Describe who you're looking for… e.g. 'Python engineer in Madrid who has shipped a payments product'"
        rows={3}
        disabled={loading}
        className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-50"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="self-end rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  )
}
