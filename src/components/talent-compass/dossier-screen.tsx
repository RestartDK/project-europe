import { useMemo, useState } from "react"
import { motion } from "framer-motion"

import type {
  Candidate,
  Connection,
  ConnectionChannel,
} from "@/data/candidates"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Textarea } from "@/components/ui/textarea"

type Props = {
  candidate: Candidate
  onBack: () => void
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

const channelIcon: Record<ConnectionChannel, string> = {
  github: "⌘",
  twitter: "𝕏",
  slack: "#",
  conference: "◉",
  company: "◆",
  university: "▲",
  oss: "⚡",
}

const strengthStroke: Record<string, { width: number; opacity: number }> = {
  strong: { width: 2.5, opacity: 0.6 },
  medium: { width: 1.5, opacity: 0.35 },
  weak: { width: 1, opacity: 0.18 },
}

const strengthBadgeClass: Record<string, string> = {
  strong: "bg-foreground/15 text-foreground",
  medium: "bg-foreground/10 text-muted-foreground",
  weak: "bg-secondary text-muted-foreground/80",
}

function NetworkGraph({
  candidate,
  connections,
}: {
  candidate: Candidate
  connections: Connection[]
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const youAvatarUrl = "https://api.dicebear.com/7.x/notionists/svg?seed=you"

  const layout = useMemo(() => {
    const w = 520
    const h = Math.max(200, 80 + connections.length * 60)
    const you = { x: 60, y: h / 2 }
    const target = { x: w - 60, y: h / 2 }

    const connectorPositions = connections.map((_, i) => {
      const total = connections.length
      const spacing = Math.min(60, (h - 80) / Math.max(total - 1, 1))
      const startY = h / 2 - ((total - 1) * spacing) / 2
      return { x: w / 2, y: startY + i * spacing }
    })

    return { w, h, you, target, connectorPositions }
  }, [connections])

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${layout.w} ${layout.h}`}
        className="w-full"
        style={{ minWidth: 360, maxHeight: 320 }}
      >
        {connections.map((conn, i) => {
          const s = strengthStroke[conn.strength]
          const cp = layout.connectorPositions[i]
          const isHovered = hoveredNode === conn.id
          return (
            <g key={`edge-left-${conn.id}`}>
              <motion.path
                d={`M ${layout.you.x} ${layout.you.y} C ${layout.you.x + 60} ${layout.you.y}, ${cp.x - 60} ${cp.y}, ${cp.x} ${cp.y}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={isHovered ? s.width + 1 : s.width}
                opacity={isHovered ? s.opacity + 0.2 : s.opacity}
                className="text-foreground transition-all duration-200"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              />
            </g>
          )
        })}

        {connections.map((conn, i) => {
          const s = strengthStroke[conn.strength]
          const cp = layout.connectorPositions[i]
          const isHovered = hoveredNode === conn.id
          return (
            <g key={`edge-right-${conn.id}`}>
              <motion.path
                d={`M ${cp.x} ${cp.y} C ${cp.x + 60} ${cp.y}, ${layout.target.x - 60} ${layout.target.y}, ${layout.target.x} ${layout.target.y}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={isHovered ? s.width + 1 : s.width}
                opacity={isHovered ? s.opacity + 0.2 : s.opacity}
                className="text-foreground transition-all duration-200"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.1 }}
              />
              {conn.channels.length > 0 && (
                <foreignObject
                  x={cp.x + 30}
                  y={cp.y - 10}
                  width={100}
                  height={20}
                  className="pointer-events-none overflow-visible"
                >
                  <div className="flex gap-0.5">
                    {conn.channels.slice(0, 2).map((ch) => (
                      <Badge
                        key={ch.type}
                        variant="secondary"
                        className="h-4 rounded px-1 py-0 text-[7px] font-normal text-muted-foreground"
                      >
                        {channelIcon[ch.type]}
                      </Badge>
                    ))}
                  </div>
                </foreignObject>
              )}
            </g>
          )
        })}

        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <circle
            cx={layout.you.x}
            cy={layout.you.y}
            r={22}
            className="fill-secondary stroke-border"
            strokeWidth={1}
          />
          <clipPath id="you-clip">
            <circle cx={layout.you.x} cy={layout.you.y} r={14} />
          </clipPath>
          <image
            href={youAvatarUrl}
            x={layout.you.x - 14}
            y={layout.you.y - 14}
            width={28}
            height={28}
            clipPath="url(#you-clip)"
          />
          <text
            x={layout.you.x}
            y={layout.you.y + 34}
            textAnchor="middle"
            className="fill-foreground text-[9px] font-bold"
          >
            you
          </text>
        </motion.g>

        {connections.map((conn, i) => {
          const cp = layout.connectorPositions[i]
          const isHovered = hoveredNode === conn.id
          const clipId = `conn-clip-${conn.id}`
          return (
            <motion.g
              key={conn.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
              onMouseEnter={() => setHoveredNode(conn.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <circle
                cx={cp.x}
                cy={cp.y}
                r={isHovered ? 20 : 17}
                className={`fill-background stroke-border transition-all duration-200 ${isHovered ? "stroke-foreground/30" : ""}`}
                strokeWidth={isHovered ? 1.5 : 1}
              />
              <clipPath id={clipId}>
                <circle cx={cp.x} cy={cp.y} r={isHovered ? 12 : 10} />
              </clipPath>
              <image
                href={conn.avatar}
                x={cp.x - (isHovered ? 12 : 10)}
                y={cp.y - (isHovered ? 12 : 10)}
                width={isHovered ? 24 : 20}
                height={isHovered ? 24 : 20}
                clipPath={`url(#${clipId})`}
              />
              <text
                x={cp.x}
                y={cp.y + (isHovered ? 30 : 27)}
                textAnchor="middle"
                className="fill-foreground text-[8px] font-medium"
              >
                {conn.name.split(" ")[0].toLowerCase()}
              </text>
              <text
                x={cp.x}
                y={cp.y + (isHovered ? 39 : 36)}
                textAnchor="middle"
                className="fill-muted-foreground text-[7px]"
              >
                {conn.strength}
              </text>
            </motion.g>
          )
        })}

        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <circle
            cx={layout.target.x}
            cy={layout.target.y}
            r={24}
            className="fill-secondary stroke-border"
            strokeWidth={1.5}
          />
          <clipPath id="target-clip">
            <circle cx={layout.target.x} cy={layout.target.y} r={16} />
          </clipPath>
          <image
            href={candidate.avatar}
            x={layout.target.x - 16}
            y={layout.target.y - 16}
            width={32}
            height={32}
            clipPath="url(#target-clip)"
          />
          <text
            x={layout.target.x}
            y={layout.target.y + 36}
            textAnchor="middle"
            className="fill-foreground text-[9px] font-bold"
          >
            {candidate.name.split(" ")[0].toLowerCase()}
          </text>
        </motion.g>
      </svg>
    </div>
  )
}

function ConnectionCard({
  conn,
  candidateName,
}: {
  conn: Connection
  candidateName: string
}) {
  const [showDraft, setShowDraft] = useState(false)

  const introMessage = `hey ${conn.name.split(" ")[0].toLowerCase()},\n\ni came across ${candidateName.toLowerCase()}'s work and i'm really impressed.\n\nwould you be open to making an introduction? i'd love to chat with them about a role we're hiring for.\n\nthanks!`

  return (
    <Card className="transition-colors hover:border-foreground/15">
      <CardContent className="p-3 pt-3">
        <div className="flex items-start gap-2.5">
          <Avatar className="size-6 rounded-full">
            <AvatarImage src={conn.avatar} alt={conn.name} />
            <AvatarFallback>{conn.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-foreground">
                {conn.name.toLowerCase()}
              </span>
              <Badge
                variant="secondary"
                className={`h-5 px-1.5 text-[8px] ${strengthBadgeClass[conn.strength]}`}
              >
                {conn.strength}
              </Badge>
            </div>
            <p className="text-[9px] text-muted-foreground">
              {conn.role.toLowerCase()}
            </p>

            <div className="mt-1.5 flex flex-wrap gap-1">
              {conn.channels.map((ch) => (
                <Badge
                  key={ch.type + ch.detail}
                  variant="outline"
                  className="gap-0.5 px-1.5 py-0 text-[8px] font-normal text-muted-foreground"
                >
                  <span className="opacity-50">{channelIcon[ch.type]}</span>
                  {ch.detail.toLowerCase()}
                </Badge>
              ))}
            </div>

            <div className="mt-1.5 flex items-center gap-2.5 text-[9px] text-muted-foreground/50">
              <span>{conn.lastInteraction}</span>
              {conn.sharedProjects > 0 && (
                <span>{conn.sharedProjects} shared</span>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1.5 h-auto px-0 text-[9px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowDraft(!showDraft)}
            >
              {showDraft ? "hide draft ↑" : "draft intro →"}
            </Button>

            {showDraft && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2"
              >
                <Textarea
                  readOnly
                  className="min-h-[100px] rounded-xl text-[10px] leading-relaxed"
                  defaultValue={introMessage}
                />
                <Button
                  type="button"
                  size="sm"
                  className="mt-1 rounded-full text-[9px]"
                >
                  copy message
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DossierScreen({ candidate: c, onBack }: Props) {
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
                <Avatar className="size-9 rounded-full">
                  <AvatarImage src={c.avatar} alt={c.name} />
                  <AvatarFallback>{c.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="font-heading text-base font-bold">
                    {c.name.toLowerCase()}
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {c.role.toLowerCase()}
                  </CardDescription>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Avatar className="size-3 rounded-full">
                      <AvatarImage src={c.companyLogo} alt={c.company} />
                      <AvatarFallback className="text-[6px]">
                        {c.company.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground">
                      {c.company.toLowerCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.location.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {c.matchScore}
                  </div>
                  <div className="text-[9px] text-muted-foreground">match</div>
                </div>
              </div>

              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                {c.summary.toLowerCase()}
              </p>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {["github", "blog", "twitter"].map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full px-2.5 text-[10px]"
                    asChild
                  >
                    <a href="#">{label} ↗</a>
                  </Button>
                ))}
              </div>

              <div className="mb-5 flex flex-wrap gap-1">
                {c.stack.map((s) => (
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
                {c.matchBreakdown.map((b) => (
                  <BreakdownBar key={b.label} label={b.label} score={b.score} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {c.repos.length > 0 && (
              <Card className="rounded-2xl py-5">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    repos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 px-5 pt-3">
                  {c.repos.map((repo, index) => (
                    <div key={repo.name}>
                      {index > 0 && <Separator className="my-2.5" />}
                      <div className="pb-0.5">
                        <Button variant="link" asChild className="h-auto p-0 text-xs font-medium">
                          <a href="#">{repo.name}</a>
                        </Button>
                        <span className="ml-1.5 text-[10px] text-muted-foreground">
                          ★ {repo.stars}
                        </span>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {repo.description.toLowerCase()}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60 italic">
                          ↳ {repo.relevance.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {c.blogPosts.length > 0 && (
              <Card className="rounded-2xl py-5">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 px-5 pt-3">
                  {c.blogPosts.map((post, index) => (
                    <div key={post.title}>
                      {index > 0 && <Separator className="my-2.5" />}
                      <div className="pb-0.5">
                        <Button variant="link" asChild className="h-auto p-0 text-xs font-medium">
                          <a href="#">{post.title.toLowerCase()}</a>
                        </Button>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {post.date}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          &ldquo;{post.excerpt.toLowerCase()}&rdquo;
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
                  community
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5 px-5 pt-3">
                {c.communitySignals.map((signal) => (
                  <Badge
                    key={signal}
                    variant="secondary"
                    className="rounded-full px-2.5 py-1 text-[10px] font-normal"
                  >
                    {signal.toLowerCase()}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-5 rounded-2xl py-5">
          <CardHeader className="px-5 pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-sm">network</CardTitle>
                <CardDescription className="mt-0.5 text-[10px]">
                  {c.connections.length} connection
                  {c.connections.length !== 1 ? "s" : ""} to{" "}
                  {c.name.split(" ")[0].toLowerCase()}
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
            <NetworkGraph candidate={c} connections={c.connections} />
            <Separator />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {c.connections.map((conn) => (
                <ConnectionCard
                  key={conn.id}
                  conn={conn}
                  candidateName={c.name}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
