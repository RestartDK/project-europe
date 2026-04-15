import { useState } from "react"
import { motion } from "framer-motion"

import { type Candidate, candidates } from "@/data/candidates"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Props = {
  onSelectCandidate: (c: Candidate) => void
}

const filters = ["all", "backend", "frontend", "infra", "ml", "security"]

const weightKeys = ["github", "blog", "network", "oss"] as const

function SignalDot({ value }: { value: number }) {
  const color =
    value >= 85
      ? "bg-success"
      : value >= 65
        ? "bg-foreground/40"
        : "bg-muted-foreground/30"
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-1.5 rounded-full ${color}`} />
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {value}
      </span>
    </div>
  )
}

function MatchBar({ score }: { score: number }) {
  const barColor =
    score >= 85
      ? "var(--success)"
      : score >= 70
        ? "var(--warning)"
        : "var(--muted-foreground)"
  return (
    <div className="flex min-w-[110px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="w-6 text-right text-[11px] font-medium text-foreground tabular-nums">
        {score}
      </span>
    </div>
  )
}

export function ResultsScreen({ onSelectCandidate }: Props) {
  const [activeFilter, setActiveFilter] = useState("all")
  const [weights, setWeights] = useState({
    github: true,
    blog: true,
    network: true,
    oss: true,
  })

  const activeWeightValues = weightKeys.filter((k) => weights[k])

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-5">
          <h2 className="font-heading text-xl font-bold text-foreground">
            discovery results
          </h2>
          <p className="text-xs text-muted-foreground">
            {candidates.length} candidates
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <ToggleGroup
            type="single"
            value={activeFilter}
            onValueChange={(v) => v && setActiveFilter(v)}
            variant="outline"
            size="sm"
            spacing={4}
            className="flex min-w-0 flex-wrap justify-start gap-1.5"
          >
            {filters.map((f) => (
              <ToggleGroupItem
                key={f}
                value={f}
                className="rounded-full px-3 text-[11px] font-medium data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                {f}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Separator
            orientation="vertical"
            className="mx-1 hidden h-6 sm:block"
          />

          <div className="flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
            <span className="mr-1 text-[10px] text-muted-foreground">
              weights
            </span>
            <ToggleGroup
              type="multiple"
              value={activeWeightValues}
              onValueChange={(vals) => {
                setWeights({
                  github: vals.includes("github"),
                  blog: vals.includes("blog"),
                  network: vals.includes("network"),
                  oss: vals.includes("oss"),
                })
              }}
              variant="outline"
              size="sm"
              spacing={4}
              className="flex flex-wrap justify-start gap-1.5"
            >
              {weightKeys.map((key) => (
                <ToggleGroupItem
                  key={key}
                  value={key}
                  className="rounded-full px-2.5 text-[10px] font-medium capitalize data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
                >
                  {key}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl py-0 ring-1 ring-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground">
                    candidate
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground">
                    role
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground">
                    company
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground">
                    match
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">
                    gh
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">
                    blog
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">
                    net
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">
                    oss
                  </th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onSelectCandidate(c)}
                    className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-6 rounded-full">
                          <AvatarImage src={c.avatar} alt={c.name} />
                          <AvatarFallback className="text-[10px]">
                            {c.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-foreground group-hover:underline">
                          {c.name.toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-foreground">
                        {c.role.toLowerCase()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.stack.slice(0, 3).join(" · ").toLowerCase()}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={c.companyLogo}
                          alt={c.company}
                          className="size-3.5 rounded-full bg-secondary object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                              "none"
                          }}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {c.company.toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <MatchBar score={c.matchScore} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <SignalDot value={c.githubSignal} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <SignalDot value={c.blogSignal} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <SignalDot value={c.networkProximity} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <SignalDot value={c.ossContributions} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
