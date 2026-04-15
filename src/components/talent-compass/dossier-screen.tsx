import { motion } from "framer-motion"
import type { FunctionReturnType } from "convex/server"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { api } from "../../../convex/_generated/api"

type Dossier = FunctionReturnType<typeof api.ranking.getCandidateDossier>

type Props = {
  dossier: Dossier
  onBack: () => void
  onFeedback: (disposition: "thumbs_up" | "thumbs_down" | "promote" | "hide") => void
}

function BreakdownBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[11px] text-muted-foreground">
        {label.toLowerCase()}
      </span>
      <Progress
        value={score}
        className="h-1 flex-1 bg-secondary [&_[data-slot=progress-indicator]]:bg-foreground/60"
      />
      <span className="w-6 text-right text-[11px] text-foreground tabular-nums">
        {score}
      </span>
    </div>
  )
}

export function DossierScreen({ dossier, onBack, onFeedback }: Props) {
  if (dossier === undefined) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-6 h-auto px-0 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          ← back
        </Button>
        <div className="rounded-2xl border border-border bg-card p-6 text-xs text-muted-foreground">
          loading dossier…
        </div>
      </div>
    )
  }

  if (dossier === null) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-6 h-auto px-0 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          ← back
        </Button>
        <div className="rounded-2xl border border-border bg-card p-6 text-xs text-muted-foreground">
          dossier not available.
        </div>
      </div>
    )
  }

  const c = dossier.candidate

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-6 h-auto px-0 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          ← back
        </Button>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl py-5">
            <CardContent className="space-y-4 px-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="font-heading text-base font-bold">
                    {c.fullName.toLowerCase()}
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {c.headline.toLowerCase()}
                  </CardDescription>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {(c.currentCompany ?? "—").toLowerCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(c.location ?? "—").toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {Math.round(dossier.finalScore)}
                  </div>
                  <div className="text-[9px] text-muted-foreground">match</div>
                </div>
              </div>

              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                {c.summary.toLowerCase()}
              </p>

              <div className="mb-5 flex flex-wrap gap-1">
                {c.stacks.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="rounded-full px-2 py-0 text-[10px] font-normal"
                  >
                    {s.toLowerCase()}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2">
                <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  breakdown
                </CardTitle>
                <BreakdownBar
                  label="role fit"
                  score={Math.round(dossier.factorBreakdown.roleFit)}
                />
                <BreakdownBar
                  label="stack fit"
                  score={Math.round(dossier.factorBreakdown.stackFit)}
                />
                <BreakdownBar
                  label="domain fit"
                  score={Math.round(dossier.factorBreakdown.domainFit)}
                />
                <BreakdownBar
                  label="evidence"
                  score={Math.round(dossier.factorBreakdown.evidenceStrength)}
                />
                <BreakdownBar
                  label="recency"
                  score={Math.round(dossier.factorBreakdown.recency)}
                />
                <BreakdownBar
                  label="confidence"
                  score={Math.round(dossier.factorBreakdown.signalConfidence)}
                />
                <BreakdownBar
                  label="reachability"
                  score={Math.round(dossier.factorBreakdown.reachabilityBonus)}
                />
              </div>

              {c.warmIntroPath && (
                <div className="pt-2">
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    warm intro
                  </CardTitle>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {c.warmIntroPath}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-2xl py-5">
              <CardHeader className="px-5 pb-0">
                <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pt-3">
                {dossier.evidence.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    no evidence items for this candidate yet.
                  </p>
                ) : (
                  dossier.evidence.map((item, index) => (
                    <div key={item.evidenceId}>
                      {index > 0 && <Separator className="my-2.5" />}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="h-5 rounded-full px-2 py-0 text-[9px] font-normal"
                          >
                            {item.kind}
                          </Badge>
                          <p className="text-xs font-medium text-foreground">
                            {item.title.toLowerCase()}
                          </p>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {item.snippet.toLowerCase()}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.tags.slice(0, 4).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="rounded-full px-2 py-0 text-[9px] font-normal text-muted-foreground"
                            >
                              {tag.toLowerCase()}
                            </Badge>
                          ))}
                        </div>
                        {item.url && (
                          <Button
                            variant="link"
                            asChild
                            className="h-auto p-0 text-[11px] font-medium"
                          >
                            <a href={item.url} target="_blank" rel="noreferrer">
                              open ↗
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl py-5">
              <CardHeader className="px-5 pb-0">
                <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  recruiter feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pt-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full text-[10px]"
                    onClick={() => onFeedback("thumbs_up")}
                  >
                    thumbs up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full text-[10px]"
                    onClick={() => onFeedback("thumbs_down")}
                  >
                    thumbs down
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full text-[10px]"
                    onClick={() => onFeedback("promote")}
                  >
                    promote
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full text-[10px]"
                    onClick={() => onFeedback("hide")}
                  >
                    hide
                  </Button>
                </div>

                {dossier.feedback.length > 0 && (
                  <div className="space-y-2">
                    {dossier.feedback.map((f) => (
                      <div
                        key={f.feedbackId}
                        className="rounded-xl border border-border bg-secondary/20 px-3 py-2 text-[11px] text-muted-foreground"
                      >
                        {f.disposition.replaceAll("_", " ").toLowerCase()}
                        {f.note ? ` · ${f.note}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

