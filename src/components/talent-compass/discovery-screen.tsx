import { useMemo } from "react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

type RankingStatus =
  | "ready_for_clay"
  | "clay_queued"
  | "importing_candidates"
  | "ranking"
  | "ranked"
  | "error"

type Props = {
  onBack: () => void
  status: RankingStatus
  errorMessage?: string
  rankingNotes?: string
}

function statusCopy(status: RankingStatus) {
  switch (status) {
    case "ready_for_clay":
      return "preparing candidate search…"
    case "clay_queued":
      return "queueing candidate import…"
    case "importing_candidates":
      return "importing candidates…"
    case "ranking":
      return "ranking candidates…"
    case "ranked":
      return "done — results ready"
    case "error":
      return "something went wrong"
  }
}

function statusProgress(status: RankingStatus) {
  switch (status) {
    case "ready_for_clay":
      return 18
    case "clay_queued":
      return 35
    case "importing_candidates":
      return 62
    case "ranking":
      return 88
    case "ranked":
      return 100
    case "error":
      return 100
  }
}

export function DiscoveryScreen({
  onBack,
  status,
  errorMessage,
  rankingNotes,
}: Props) {
  const message = useMemo(() => statusCopy(status), [status])
  const target = useMemo(() => statusProgress(status), [status])

  return (
    <div className="flex min-h-screen flex-col px-4 pt-6 pb-8 sm:px-6 sm:pt-8">
      <header className="mx-auto mb-6 w-full max-w-6xl text-left">
        <Button
          type="button"
          variant="ghost"
          className="-ml-2 h-8 justify-start rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          ← edit criteria
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <Card className="w-full max-w-sm border-none bg-transparent py-0 shadow-none ring-0">
          <CardContent className="px-0">
            <motion.div
              className="w-full text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="mx-auto mb-8 flex size-3 items-center justify-center"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Skeleton className="size-3 animate-none rounded-full bg-foreground/80" />
              </motion.div>

              <motion.p
                key={message}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-2 text-xs text-muted-foreground"
              >
                {message}
              </motion.p>

              {rankingNotes && status !== "error" && (
                <p className="mb-6 text-[10px] leading-relaxed text-muted-foreground/70">
                  {rankingNotes}
                </p>
              )}

              {status === "error" && (
                <div className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-left text-[11px] text-destructive">
                  {errorMessage ?? "Ranking failed."}
                </div>
              )}

              <Progress
                value={Math.min(target, 100)}
                className="h-1 bg-secondary [&_[data-slot=progress-indicator]]:bg-foreground/60"
              />
              <p className="mt-2 text-[10px] text-muted-foreground tabular-nums">
                {Math.min(Math.round(target), 100)}%
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
