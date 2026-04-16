import { motion } from "framer-motion"
import type { FunctionReturnType } from "convex/server"

import { ConnectionCard } from "@/components/talent-compass/connection-card"
import { GithubCommitGraph } from "@/components/talent-compass/github-commit-graph"
import { DossierEvidenceSourceIcon } from "@/components/talent-compass/info-source-icons"
import { RelevanceSignalIcon } from "@/components/talent-compass/relevance-signal-icon"
import { NetworkGraph } from "@/components/talent-compass/network-graph"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { NetworkConnection } from "@/types/network"
import { api } from "../../../convex/_generated/api"

type Dossier = FunctionReturnType<typeof api.ranking.getCandidateDossier>

type Props = {
  dossier: Dossier | null | undefined
}

function normalizeHref(href: string) {
  return href.startsWith("http") ? href : `https://${href}`
}

function extractGithubUsername(href?: string) {
  if (!href) return null

  const normalized = normalizeHref(href).trim()

  try {
    const url = new URL(normalized)
    if (!url.hostname.toLowerCase().includes("github.com")) {
      return null
    }
    const [username] = url.pathname.split("/").filter(Boolean)
    return username ?? null
  } catch {
    return null
  }
}

function enrichmentCopy(
  status: NonNullable<Dossier>["candidate"]["enrichmentStatus"]
) {
  switch (status) {
    case "ready":
      return {
        badge: "ready now",
        detail:
          "This profile already has enough local data to review immediately.",
      }
    case "queued":
      return {
        badge: "getting from clay",
        detail:
          "Clay is still filling in more profile and contact details for this person.",
      }
    case "complete":
      return {
        badge: "updated",
        detail: "Clay enrichment has landed on this profile.",
      }
    case "failed":
      return {
        badge: "retry needed",
        detail: "Clay enrichment did not complete for this profile yet.",
      }
  }
}

function enrichmentBadgeCn(
  status: NonNullable<Dossier>["candidate"]["enrichmentStatus"]
) {
  switch (status) {
    case "ready":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "queued":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "complete":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
    case "failed":
      return "border-destructive/30 bg-destructive/10 text-destructive"
  }
}

export function DossierScreen({ dossier }: Props) {
  if (dossier === undefined) {
    return (
      <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 px-6 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-xs text-muted-foreground">
          loading dossier…
        </div>
      </div>
    )
  }

  if (dossier === null) {
    return (
      <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 px-6 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-xs text-muted-foreground">
          dossier not available.
        </div>
      </div>
    )
  }

  const c = dossier.candidate
  const connections = dossier.networkConnections as NetworkConnection[]

  const socialLinks: { label: string; href: string }[] = []
  if (c.profileUrl) {
    const isLi = c.profileUrl.toLowerCase().includes("linkedin.com")
    socialLinks.push({
      label: isLi ? "linkedin" : "profile",
      href: normalizeHref(c.profileUrl),
    })
  }
  if (c.socialGithub) {
    socialLinks.push({ label: "github", href: normalizeHref(c.socialGithub) })
  }
  if (c.socialTwitter) {
    socialLinks.push({ label: "x", href: normalizeHref(c.socialTwitter) })
  }
  if (c.socialBlog) {
    socialLinks.push({ label: "blog", href: normalizeHref(c.socialBlog) })
  }

  const rankedEvidence = [...dossier.evidence]
  const githubUsername = extractGithubUsername(c.socialGithub)
  const enrichment = enrichmentCopy(c.enrichmentStatus)

  return (
    <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 px-6 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-5"
      >
        <Card className="rounded-2xl py-5">
          <CardContent className="space-y-5 px-5">
            <div className="flex items-start gap-4">
              <div className="size-14 shrink-0 overflow-hidden rounded-full border border-border">
                <img
                  src={c.avatarDisplayUrl}
                  alt={c.fullName}
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="font-heading text-lg font-bold tracking-tight">
                      {c.fullName.toLowerCase()}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="text-foreground/80">age</span>{" "}
                      {c.age != null ? (
                        <span className="text-foreground tabular-nums">
                          {c.age}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                      {c.location ? (
                        <>
                          <span className="mx-2 text-border">·</span>
                          <span>{c.location.toLowerCase()}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="text-xs leading-snug font-medium text-foreground">
                      {c.headline.toLowerCase()}
                    </p>
                    <Badge
                      variant="secondary"
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${enrichmentBadgeCn(c.enrichmentStatus)}`}
                    >
                      {enrichment.badge}
                    </Badge>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-heading text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
                      {Math.round(dossier.finalScore)}
                    </div>
                    <div className="text-[10px] font-medium tracking-wide text-muted-foreground sm:text-xs">
                      match
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                about
              </CardTitle>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {enrichment.detail.toLowerCase()}
              </p>
              <p className="text-xs leading-relaxed text-foreground">
                {c.summary.toLowerCase()}
              </p>
              <p className="border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
                {dossier.summaryWhy.toLowerCase()}
              </p>
            </div>

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

            {socialLinks.length > 0 && (
              <div>
                <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  social
                </CardTitle>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {socialLinks.map(({ label, href }) => (
                    <Button
                      key={`${label}-${href}`}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 rounded-full px-2.5 text-[10px]"
                      asChild
                    >
                      <a href={href} target="_blank" rel="noreferrer">
                        {label} ↗
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                skills
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.stacks.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-normal"
                  >
                    {s.toLowerCase()}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl py-5">
          <CardHeader className="px-5 pb-0">
            <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              github activity
            </CardTitle>
            <CardDescription className="text-[10px]">
              {githubUsername
                ? `live contribution graph for @${githubUsername.toLowerCase()}`
                : "github profile not available"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pt-4">
            <GithubCommitGraph username={githubUsername} />
          </CardContent>
        </Card>

        {rankedEvidence.length > 0 && (
          <Card className="rounded-2xl py-5">
            <CardHeader className="px-5 pb-0">
              <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                ranked signals
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 px-2 text-[10px] font-bold tracking-widest uppercase">
                      src
                    </TableHead>
                    <TableHead className="px-2 text-[10px] font-bold tracking-widest uppercase">
                      link
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedEvidence.map((row) => (
                    <TableRow key={row.evidenceId} className="align-top">
                      <TableCell className="px-2 py-4">
                        <DossierEvidenceSourceIcon
                          url={row.url}
                          kind={row.kind}
                        />
                      </TableCell>
                      <TableCell className="max-w-0 px-2 py-4">
                        <div className="space-y-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="min-w-0 flex-1">
                              {row.url ? (
                                <Button
                                  variant="link"
                                  asChild
                                  className="h-auto min-w-0 justify-start p-0 text-left text-xs font-medium"
                                >
                                  <a
                                    href={row.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="min-w-0 break-words"
                                  >
                                    {row.title.toLowerCase()}
                                  </a>
                                </Button>
                              ) : (
                                <span className="block min-w-0 text-xs font-medium text-foreground">
                                  {row.title.toLowerCase()}
                                </span>
                              )}
                            </div>
                            {row.relevanceDisplay ? (
                              <Badge
                                variant="secondary"
                                className="z-10 mt-0.5 flex h-auto max-w-[min(100%,12.5rem)] shrink-0 items-center gap-1 rounded-full border border-border bg-card/95 py-0.5 pr-2.5 pl-2 text-[10px] font-normal shadow-sm backdrop-blur-sm sm:max-w-[15rem]"
                              >
                                <RelevanceSignalIcon
                                  url={row.url}
                                  kind={row.kind}
                                  relevanceDisplay={row.relevanceDisplay}
                                />
                                <span className="min-w-0 truncate">
                                  {row.relevanceDisplay.toLowerCase()}
                                </span>
                              </Badge>
                            ) : null}
                          </div>
                          <blockquote className="border-l-2 border-muted-foreground/25 pl-3 text-[11px] leading-relaxed text-muted-foreground">
                            {row.snippet.toLowerCase()}
                          </blockquote>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {connections.length > 0 && (
          <Card className="rounded-2xl py-5">
            <CardHeader className="px-5 pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-sm">
                    network
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-[10px]">
                    {connections.length} connection
                    {connections.length !== 1 ? "s" : ""} to{" "}
                    {c.fullName.split(" ")[0]?.toLowerCase() ?? ""}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Progress
                      value={100}
                      className="h-[3px] w-5 bg-transparent [&_[data-slot=progress-indicator]]:bg-foreground/60"
                    />
                    strong
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Progress
                      value={100}
                      className="h-[2px] w-5 bg-transparent [&_[data-slot=progress-indicator]]:bg-foreground/35"
                    />
                    medium
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Progress
                      value={100}
                      className="h-[1.5px] w-5 bg-transparent [&_[data-slot=progress-indicator]]:bg-foreground/18"
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
                  <ConnectionCard
                    key={conn.id}
                    conn={conn}
                    candidateName={c.fullName}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
