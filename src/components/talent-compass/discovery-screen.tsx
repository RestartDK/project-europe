import { useMemo } from "react"
import { motion } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type RankingStatus =
  | "pending"
  | "searching"
  | "enriching"
  | "ranking"
  | "ranked"
  | "error"

type Props = {
  status: RankingStatus
  errorMessage?: string
  rankingNotes?: string
}

function statusCopy(status: RankingStatus) {
  switch (status) {
    case "pending":
      return "preparing search…"
    case "searching":
      return "searching for candidates…"
    case "enriching":
      return "enriching candidate data…"
    case "ranking":
      return "ranking candidates…"
    case "ranked":
      return "done — results ready"
    case "error":
      return "something went wrong"
  }
}

export function DiscoveryScreen({ status, errorMessage, rankingNotes }: Props) {
  const message = useMemo(() => statusCopy(status), [status])

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-8 sm:px-6">
      <div className="flex min-h-[min(320px,45svh)] flex-1 flex-col items-center justify-center">
        <Card className="w-full max-w-sm overflow-visible border-none bg-transparent py-0 shadow-none ring-0">
          <CardContent className="px-0">
            <div className="w-full text-center">
              <motion.div
                className="mx-auto mb-8 flex size-10 items-center justify-center"
                animate={{ scale: [1, 1.08, 1], opacity: [0.55, 1, 0.55] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Skeleton className="size-10 animate-none rounded-full bg-foreground/25" />
              </motion.div>

              <p className="mb-2 text-xs text-muted-foreground">{message}</p>

              {rankingNotes && status !== "error" && (
                <p className="mb-6 text-[10px] leading-relaxed text-muted-foreground/70">
                  {rankingNotes}
                </p>
              )}

              {status === "error" && (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-left text-[11px] text-destructive">
                  {errorMessage ?? "Ranking failed."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
