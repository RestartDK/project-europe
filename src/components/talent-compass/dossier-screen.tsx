import { motion } from "framer-motion";
import type { FunctionReturnType } from "convex/server";

import { ConnectionCard } from "@/components/talent-compass/connection-card";
import { NetworkGraph } from "@/components/talent-compass/network-graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { NetworkConnection } from "@/types/network";
import { api } from "../../../convex/_generated/api";

type Dossier = FunctionReturnType<typeof api.ranking.getCandidateDossier>;

type Props = {
  dossier: Dossier | null | undefined;
  onBack: () => void;
  onFeedback: (disposition: "thumbs_up" | "thumbs_down" | "promote" | "hide") => void;
};

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
      <span className="w-6 text-right text-[11px] text-foreground tabular-nums">{score}</span>
    </div>
  );
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
    );
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
    );
  }

  const c = dossier.candidate;
  const connections = dossier.networkConnections as NetworkConnection[];

  const repoEvidence = dossier.evidence.filter((e) => e.kind === "repo");
  const postEvidence = dossier.evidence.filter((e) => e.kind === "blog" || e.kind === "talk");
  const communityEvidence = dossier.evidence.filter(
    (e) => e.kind === "community" || e.kind === "employment",
  );
  const networkOnlyEvidence = dossier.evidence.filter((e) => e.kind === "network");

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
                <div className="relative">
                  <div className="size-9 overflow-hidden rounded-full">
                    <img
                      src={c.avatarDisplayUrl}
                      alt={c.fullName}
                      className="size-full object-cover"
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="font-heading text-base font-bold">
                    {c.fullName.toLowerCase()}
                  </CardTitle>
                  <CardDescription className="text-[11px]">{c.headline.toLowerCase()}</CardDescription>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {c.companyLogoUrl && (
                      <div className="size-3 overflow-hidden rounded-full">
                        <img src={c.companyLogoUrl} alt="" className="size-full object-contain" />
                      </div>
                    )}
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

              <p className="text-xs font-medium leading-relaxed text-foreground">
                {dossier.summaryWhy.toLowerCase()}
              </p>

              <p className="text-xs leading-relaxed text-muted-foreground">{c.summary.toLowerCase()}</p>

              {dossier.topStrengths.length > 0 && (
                <div>
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    strengths
                  </CardTitle>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-muted-foreground">
                    {dossier.topStrengths.map((s) => (
                      <li key={s}>{s.toLowerCase()}</li>
                    ))}
                  </ul>
                </div>
              )}

              {dossier.risksOrGaps.length > 0 && (
                <div>
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    risks / gaps
                  </CardTitle>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-muted-foreground">
                    {dossier.risksOrGaps.map((s) => (
                      <li key={s}>{s.toLowerCase()}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "github", href: c.socialGithub },
                  { label: "blog", href: c.socialBlog },
                  { label: "twitter", href: c.socialTwitter },
                ].map(
                  ({ label, href }) =>
                    href && (
                      <Button
                        key={label}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 rounded-full px-2.5 text-[10px]"
                        asChild
                      >
                        <a href={href.startsWith("http") ? href : `https://${href}`} target="_blank" rel="noreferrer">
                          {label} ↗
                        </a>
                      </Button>
                    ),
                )}
                {c.profileUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full px-2.5 text-[10px]"
                    asChild
                  >
                    <a href={c.profileUrl} target="_blank" rel="noreferrer">
                      profile ↗
                    </a>
                  </Button>
                )}
              </div>

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
                <BreakdownBar label="role fit" score={Math.round(dossier.factorBreakdown.roleFit)} />
                <BreakdownBar label="stack fit" score={Math.round(dossier.factorBreakdown.stackFit)} />
                <BreakdownBar label="domain fit" score={Math.round(dossier.factorBreakdown.domainFit)} />
                <BreakdownBar
                  label="evidence"
                  score={Math.round(dossier.factorBreakdown.evidenceStrength)}
                />
                <BreakdownBar label="recency" score={Math.round(dossier.factorBreakdown.recency)} />
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
            {repoEvidence.length > 0 && (
              <Card className="rounded-2xl py-5">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    repos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 px-5 pt-3">
                  {repoEvidence.map((repo, index) => (
                    <div key={repo.evidenceId}>
                      {index > 0 && <Separator className="my-2.5" />}
                      <div className="pb-0.5">
                        <Button variant="link" asChild className="h-auto p-0 text-xs font-medium">
                          <a href={repo.url ?? "#"} target="_blank" rel="noreferrer">
                            {repo.title.toLowerCase()}
                          </a>
                        </Button>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{repo.snippet.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {postEvidence.length > 0 && (
              <Card className="rounded-2xl py-5">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 px-5 pt-3">
                  {postEvidence.map((post, index) => (
                    <div key={post.evidenceId}>
                      {index > 0 && <Separator className="my-2.5" />}
                      <div className="pb-0.5">
                        <Button variant="link" asChild className="h-auto p-0 text-xs font-medium">
                          <a href={post.url ?? "#"} target="_blank" rel="noreferrer">
                            {post.title.toLowerCase()}
                          </a>
                        </Button>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          &ldquo;{post.snippet.toLowerCase()}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {communityEvidence.length > 0 && (
              <Card className="rounded-2xl py-5">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    community
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5 px-5 pt-3">
                  {communityEvidence.map((signal) => (
                    <Badge
                      key={signal.evidenceId}
                      variant="secondary"
                      className="rounded-full px-2.5 py-1 text-[10px] font-normal"
                    >
                      {signal.title.toLowerCase()}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {networkOnlyEvidence.length > 0 && (
              <Card className="rounded-2xl py-5">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    network evidence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pt-3">
                  {networkOnlyEvidence.map((item, index) => (
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
                          <p className="text-xs font-medium text-foreground">{item.title.toLowerCase()}</p>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {item.snippet.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

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

        {connections.length > 0 && (
          <Card className="mt-5 rounded-2xl py-5">
            <CardHeader className="px-5 pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-sm">network</CardTitle>
                  <CardDescription className="mt-0.5 text-[10px]">
                    {connections.length} connection{connections.length !== 1 ? "s" : ""} to{" "}
                    {c.fullName.split(" ")[0]?.toLowerCase() ?? ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[8px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Progress
                      value={100}
                      className="h-[2.5px] w-4 bg-transparent [&_[data-slot=progress-indicator]]:bg-foreground/60"
                    />
                    strong
                  </span>
                  <span className="flex items-center gap-1">
                    <Progress
                      value={100}
                      className="h-[1.5px] w-4 bg-transparent [&_[data-slot=progress-indicator]]:bg-foreground/35"
                    />
                    medium
                  </span>
                  <span className="flex items-center gap-1">
                    <Progress
                      value={100}
                      className="h-px w-4 bg-transparent [&_[data-slot=progress-indicator]]:bg-foreground/18"
                    />
                    weak
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pt-3">
              <NetworkGraph
                candidate={{ avatar: c.avatarDisplayUrl, name: c.fullName }}
                connections={connections}
              />
              <Separator />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {connections.map((conn) => (
                  <ConnectionCard key={conn.id} conn={conn} candidateName={c.fullName} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
