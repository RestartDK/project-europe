import { useQuery } from "convex/react"

import { api } from "../convex/_generated/api"

export function App() {
  const status = useQuery(api.status.get)

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-xl min-w-0 flex-col gap-4 rounded-2xl border bg-card p-6 text-sm shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Convex is set up</h1>
          <p className="text-muted-foreground">
            This app is now wrapped in `ConvexProvider` and reading from a live
            query at `api.status.get`.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/40 p-4 font-mono text-xs leading-6">
          <div>Query result: {status?.message ?? "Loading..."}</div>
          <div>Environment: {status?.environment ?? "loading"}</div>
          <div>Client URL: {import.meta.env.VITE_CONVEX_URL}</div>
          <div>Backend file: convex/status.ts</div>
        </div>

        <p className="text-xs text-muted-foreground">
          Run `bunx convex dev` while developing so Convex can watch, deploy,
          and regenerate types as you change functions.
        </p>
      </div>
    </div>
  )
}

export default App
