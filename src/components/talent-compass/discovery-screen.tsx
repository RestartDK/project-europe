import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { motion, useSpring, useTransform } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type RankingStatus =
  | "ready_for_clay"
  | "clay_queued"
  | "importing_candidates"
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

/**
 * Simulated crawl: stay at or above `floor`, ease toward `cap` over wall-clock time
 * (not per-frame random jumps) so pacing feels deliberate on the way to 100%.
 */
function phaseBounds(status: RankingStatus): { floor: number; cap: number } | null {
  switch (status) {
    case "ready_for_clay":
      return { floor: 18, cap: 48 }
    case "clay_queued":
      return { floor: 35, cap: 56 }
    case "importing_candidates":
      return { floor: 62, cap: 82 }
    case "ranking":
      return { floor: 88, cap: 96 }
    default:
      return null
  }
}

/** Rough wall time to traverse start→cap for each phase (slow = more believable). */
function phaseDurationMs(status: RankingStatus): number {
  switch (status) {
    case "ready_for_clay":
      return 32_000
    case "clay_queued":
      return 22_000
    case "importing_candidates":
      return 28_000
    case "ranking":
      return 20_000
    default:
      return 20_000
  }
}

/** Slow start / slow end — reads less like a linear download bar. */
function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function useRetrievalProgress(status: RankingStatus) {
  const terminal = status === "ranked" || status === "error"
  const [raw, setRaw] = useState(() => statusProgress(status))
  const phaseAnchorRef = useRef<{ startVal: number; t0: number }>({
    startVal: statusProgress(status),
    t0: performance.now(),
  })
  const prevStatusRef = useRef<RankingStatus | null>(null)

  useLayoutEffect(() => {
    const p = statusProgress(status)
    if (terminal) {
      setRaw((prev) => (prev < p ? Math.max(prev, p - 8) : prev))
      return
    }
    const b = phaseBounds(status)
    if (!b) return

    const statusChanged = prevStatusRef.current !== status
    prevStatusRef.current = status

    setRaw((prev) => {
      const next = Math.max(b.floor, prev)
      if (statusChanged) {
        phaseAnchorRef.current = { startVal: next, t0: performance.now() }
      }
      return next
    })
  }, [status, terminal])

  useEffect(() => {
    let cancelled = false

    if (terminal) {
      const goal = 100
      const tick = () => {
        if (cancelled) return
        setRaw((prev) => {
          const delta = goal - prev
          if (delta < 0.04) return goal
          return prev + delta * (prev > 94 ? 0.045 : 0.028)
        })
        requestAnimationFrame(tick)
      }
      const id = requestAnimationFrame(tick)
      return () => {
        cancelled = true
        cancelAnimationFrame(id)
      }
    }

    const b = phaseBounds(status)!
    const tick = () => {
      if (cancelled) return
      const { startVal, t0 } = phaseAnchorRef.current
      const elapsed = performance.now() - t0
      const dur = phaseDurationMs(status)
      const u = dur > 0 ? Math.min(1, elapsed / dur) : 1
      const eased = easeInOutCubic(u)
      let next = startVal + (b.cap - startVal) * eased
      next += Math.sin(elapsed / 2_200) * 0.12
      next += (Math.random() - 0.5) * 0.04
      if (u >= 0.985) {
        next = b.cap - 0.22 + Math.sin(elapsed / 580) * 0.08
      }
      next = Math.min(b.cap, Math.max(b.floor, next))
      setRaw((prev) => (Math.abs(next - prev) < 0.015 ? prev : next))
      requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [status, terminal])

  const spring = useSpring(raw, { stiffness: 72, damping: 26, mass: 1.05 })
  useEffect(() => {
    spring.set(raw)
  }, [raw, spring])

  return { spring, terminal }
}

export function DiscoveryScreen({ status, errorMessage, rankingNotes }: Props) {
  const message = useMemo(() => statusCopy(status), [status])
  const { spring, terminal } = useRetrievalProgress(status)
  const barWidth = useTransform(spring, (v) => `${Math.min(100, Math.max(0, v))}%`)
  const labelRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (labelRef.current) {
      labelRef.current.textContent = `${Math.round(Math.min(100, Math.max(0, spring.get())))}%`
    }
  }, [spring, status])

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (labelRef.current) {
        labelRef.current.textContent = `${Math.round(Math.min(100, Math.max(0, v)))}%`
      }
    })
    return () => unsub()
  }, [spring])

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-8 sm:px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <Card className="w-full max-w-sm overflow-visible border-none bg-transparent py-0 shadow-none ring-0">
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

              <div
                className={cn(
                  "relative h-1 w-full overflow-hidden rounded-full bg-secondary",
                  status === "error" && "opacity-60",
                )}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-foreground/60"
                  style={{ width: barWidth }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 w-[28%] rounded-full bg-gradient-to-r from-transparent via-foreground/25 to-transparent"
                  initial={false}
                  animate={{ left: ["-30%", "105%"] }}
                  transition={{
                    duration: 1.65,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 w-px bg-foreground/45 shadow-[0_0_6px_rgba(255,255,255,0.35)]"
                  style={{ left: barWidth, translateX: "-50%" }}
                  animate={
                    terminal ? { opacity: [0.5, 0.88, 0.5] } : { opacity: [0.38, 0.92, 0.38] }
                  }
                  transition={{
                    duration: terminal ? 0.95 : 0.62,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground tabular-nums">
                <span ref={labelRef} className="inline-block min-w-[2.25rem] text-right" />
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
