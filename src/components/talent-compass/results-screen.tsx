import { useState } from "react"
import { motion } from "framer-motion"

import { type Candidate, candidates } from "@/data/candidates"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type Props = {
  onSelectCandidate: (c: Candidate) => void
}

const filters = ["all", "backend", "frontend", "infra", "ml", "security"]

const weightKeys = ["github", "blog", "network", "oss"] as const

const rowCn = cn(
  "cursor-pointer border-b border-border transition-colors last:border-b-0",
  "hover:bg-secondary/40"
)

const headCn =
  "h-auto px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground"

const headCnCenter =
  "h-auto px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground"

function SignalCell({ value }: { value: number }) {
  const indicatorClass =
    value >= 85
      ? "[&_[data-slot=progress-indicator]]:bg-success"
      : value >= 65
        ? "[&_[data-slot=progress-indicator]]:bg-foreground/40"
        : "[&_[data-slot=progress-indicator]]:bg-muted-foreground/30"
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <Progress
        value={value}
        className={cn("h-1 w-8 bg-secondary", indicatorClass)}
      />
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {value}
      </span>
    </div>
  )
}

function MatchBar({ score }: { score: number }) {
  const indicatorClass =
    score >= 85
      ? "[&_[data-slot=progress-indicator]]:bg-[var(--success)]"
      : score >= 70
        ? "[&_[data-slot=progress-indicator]]:bg-[var(--warning)]"
        : "[&_[data-slot=progress-indicator]]:bg-muted-foreground"
  return (
    <div className="flex min-w-[110px] items-center gap-2">
      <Progress
        value={score}
        className={cn("h-1.5 flex-1 bg-secondary", indicatorClass)}
      />
      <span className="w-6 text-right text-[11px] font-medium text-foreground tabular-nums">
        {score}
      </span>
    </div>
  )
}

const MotionTableRow = motion.create(TableRow)

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
        <Card className="mb-5 border-none bg-transparent py-0 shadow-none ring-0">
          <CardHeader className="px-0">
            <CardTitle className="font-heading text-xl font-bold">
              discovery results
            </CardTitle>
            <CardDescription className="text-xs">
              {candidates.length} candidates
            </CardDescription>
          </CardHeader>
        </Card>

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
            <Label className="mr-1 text-[10px] text-muted-foreground">
              weights
            </Label>
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
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-secondary/40 hover:bg-secondary/40">
                <TableHead className={headCn}>candidate</TableHead>
                <TableHead className={headCn}>role</TableHead>
                <TableHead className={headCn}>company</TableHead>
                <TableHead className={headCn}>match</TableHead>
                <TableHead className={headCnCenter}>gh</TableHead>
                <TableHead className={headCnCenter}>blog</TableHead>
                <TableHead className={headCnCenter}>net</TableHead>
                <TableHead className={headCnCenter}>oss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c, i) => (
                <MotionTableRow
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onSelectCandidate(c)}
                  className={cn(rowCn, "group")}
                >
                  <TableCell className="px-4 py-2.5">
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
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="text-xs text-foreground">
                      {c.role.toLowerCase()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {c.stack.slice(0, 3).join(" · ").toLowerCase()}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-3.5 rounded-full">
                        <AvatarImage src={c.companyLogo} alt={c.company} />
                        <AvatarFallback className="text-[7px]">
                          {c.company.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-muted-foreground">
                        {c.company.toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <MatchBar score={c.matchScore} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={c.githubSignal} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={c.blogSignal} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={c.networkProximity} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={c.ossContributions} />
                  </TableCell>
                </MotionTableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </motion.div>
    </div>
  )
}
