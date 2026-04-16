import { useAction } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useEffect, useState } from "react"

import { api } from "../../../convex/_generated/api"
import { cn } from "@/lib/utils"

const levelClass: Record<number, string> = {
  0: "bg-muted/80",
  1: "bg-foreground/15",
  2: "bg-foreground/35",
  3: "bg-foreground/55",
  4: "bg-foreground/75",
}

type Props = {
  username?: string | null
  className?: string
}

type ContributionCalendar = FunctionReturnType<
  typeof api.github.getContributionCalendar
>

export function GithubCommitGraph({ username, className }: Props) {
  const getContributionCalendar = useAction(api.github.getContributionCalendar)
  const [calendar, setCalendar] = useState<ContributionCalendar | undefined>(
    undefined
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCalendar() {
      if (!username) {
        setCalendar(null)
        setError(null)
        return
      }

      setCalendar(undefined)
      setError(null)

      try {
        const result = await getContributionCalendar({ username })
        if (!cancelled) {
          setCalendar(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load GitHub activity."
          )
        }
      }
    }

    void loadCalendar()

    return () => {
      cancelled = true
    }
  }, [getContributionCalendar, username])

  const dayLabels = ["", "mon", "", "wed", "", "fri", ""]

  if (!username) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-[10px] leading-snug text-muted-foreground">
          no github username available for this candidate.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-[10px] leading-snug text-destructive">
          {error.toLowerCase()}
        </p>
      </div>
    )
  }

  if (calendar === undefined) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-[10px] leading-snug text-muted-foreground">
          loading github activity…
        </p>
      </div>
    )
  }

  if (calendar === null) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-[10px] leading-snug text-muted-foreground">
          github user `{username.toLowerCase()}` not found or has no visible
          contribution data.
        </p>
      </div>
    )
  }

  const columns = calendar.weeks.length

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex shrink-0 flex-col gap-y-[3px] pt-[22px] pr-1 text-[9px] text-muted-foreground capitalize">
          {dayLabels.map((label, i) => (
            <div key={i} className="flex h-[11px] items-center leading-none">
              {label}
            </div>
          ))}
        </div>
        <div
          className="grid min-w-0 gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 11px))`,
            gridTemplateRows: "repeat(7, 11px)",
          }}
        >
          {calendar.weeks.flatMap((week, w) =>
            week.map((day, d) => (
              <div
                key={`${d}-${w}`}
                className={cn(
                  "size-[11px] rounded-sm",
                  levelClass[day.level] ?? levelClass[0]
                )}
                title={`${day.date}: ${day.contributionCount} contributions`}
              />
            ))
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 text-[9px] text-muted-foreground">
        <span>less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((lv) => (
            <div
              key={lv}
              className={cn("size-[11px] rounded-sm", levelClass[lv])}
            />
          ))}
        </div>
        <span>more</span>
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        {calendar.totalContributions.toLocaleString()} contributions in the last
        year for @{calendar.username.toLowerCase()}.
      </p>
    </div>
  )
}
