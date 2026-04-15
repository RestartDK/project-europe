import { useEffect, useMemo, useRef, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FunctionReturnType } from "convex/server";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

type SearchResults = FunctionReturnType<typeof api.ranking.getSearchResults>;
type ResultRow = NonNullable<SearchResults>["results"][number];

type Props = {
  onEditCriteria: () => void;
  onSelectScore: (scoreId: Id<"candidateScores">) => void;
  results: ResultRow[];
};

const filters = ["all", "backend", "frontend", "infra", "ml", "security"];

const weightKeys = ["github", "blog", "network", "oss"] as const;

const rowCn = cn(
  "cursor-pointer border-b border-border transition-colors last:border-b-0",
  "hover:bg-secondary/40",
);

const headCn =
  "h-auto px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground";

const headCnCenter =
  "h-auto px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground";

const stickyCandidateHead = cn(
  headCn,
  "sticky left-0 z-30 border-r border-border bg-secondary/40",
);
const stickyCandidateCell = cn(
  "px-4 py-2.5",
  "sticky left-0 z-10 border-r border-border bg-card group-hover:bg-secondary/40",
);

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}

function SignalCell({ value }: { value: number }) {
  const indicatorClass =
    value >= 85
      ? "[&_[data-slot=progress-indicator]]:bg-success"
      : value >= 65
        ? "[&_[data-slot=progress-indicator]]:bg-foreground/40"
        : "[&_[data-slot=progress-indicator]]:bg-muted-foreground/30";
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <Progress
        value={value}
        className={cn("h-1 w-8 bg-secondary", indicatorClass)}
      />
      <span className="text-[11px] text-muted-foreground tabular-nums">{value}</span>
    </div>
  );
}

function MatchBar({ score }: { score: number }) {
  const indicatorClass =
    score >= 85
      ? "[&_[data-slot=progress-indicator]]:bg-[var(--success)]"
      : score >= 70
        ? "[&_[data-slot=progress-indicator]]:bg-[var(--warning)]"
        : "[&_[data-slot=progress-indicator]]:bg-muted-foreground";
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
  );
}

const MotionTableRow = motion.create(TableRow);

function matchesStackFilter(r: ResultRow, filter: string) {
  if (filter === "all") {
    return true;
  }
  const hay = `${r.headline} ${r.stacks.join(" ")}`.toLowerCase();
  return hay.includes(filter);
}

export function ResultsScreen({ onEditCriteria, onSelectScore, results }: Props) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [weights, setWeights] = useState({
    github: true,
    blog: true,
    network: true,
    oss: true,
  });
  const [mobileStackOpen, setMobileStackOpen] = useState(false);
  const [mobileWeightsOpen, setMobileWeightsOpen] = useState(false);
  const mobileStackRef = useRef<HTMLDetailsElement>(null);
  const mobileWeightsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!mobileStackOpen && !mobileWeightsOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (mobileStackOpen && !mobileStackRef.current?.contains(target)) {
        setMobileStackOpen(false);
      }
      if (mobileWeightsOpen && !mobileWeightsRef.current?.contains(target)) {
        setMobileWeightsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [mobileStackOpen, mobileWeightsOpen]);

  const activeWeightValues = weightKeys.filter((k) => weights[k]);
  const weightSummaryLabel =
    activeWeightValues.length === weightKeys.length
      ? "all on"
      : `${activeWeightValues.length}/${weightKeys.length} on`;

  const visibleRows = useMemo(
    () => results.filter((r) => matchesStackFilter(r, activeFilter)),
    [results, activeFilter],
  );

  const roleToggleGroup = (
    <ToggleGroup
      type="single"
      value={activeFilter}
      onValueChange={(v) => v && setActiveFilter(v)}
      variant="outline"
      size="sm"
      spacing={4}
      className="flex min-w-0 w-full max-w-full flex-wrap justify-start gap-1.5"
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
  );

  const weightsToggleGroup = (layout: "panel" | "toolbar") => (
    <ToggleGroup
      type="multiple"
      value={activeWeightValues}
      onValueChange={(vals) => {
        setWeights({
          github: vals.includes("github"),
          blog: vals.includes("blog"),
          network: vals.includes("network"),
          oss: vals.includes("oss"),
        });
      }}
      variant="outline"
      size="sm"
      spacing={4}
      className={cn(
        "flex justify-start gap-1.5",
        layout === "panel" && "w-full min-w-0 max-w-full flex-wrap",
        layout === "toolbar" && "w-fit shrink-0 flex-nowrap",
      )}
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
  );

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <header className="mb-5 text-left">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 mb-2 h-8 justify-start rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onEditCriteria}
          >
            ← edit criteria
          </Button>
          <h2 className="font-heading text-xl font-bold text-foreground">discovery results</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {visibleRows.length} candidates
            {activeFilter !== "all" ? ` · filter: ${activeFilter}` : ""}
          </p>
        </header>

        <div className="mb-4 grid grid-cols-2 items-start gap-2 overflow-visible md:hidden">
          <details
            ref={mobileStackRef}
            open={mobileStackOpen}
            onToggle={(e) => setMobileStackOpen(e.currentTarget.open)}
            className="group relative z-10 rounded-2xl border border-border bg-card ring-1 ring-border/60 open:z-20"
          >
            <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2.5 text-left outline-none select-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                stack
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-[11px] font-medium capitalize text-foreground">
                {activeFilter}
              </span>
              <ChevronDown
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-xl border border-border bg-card p-2 shadow-lg ring-1 ring-border/60">
              {roleToggleGroup}
            </div>
          </details>

          <details
            ref={mobileWeightsRef}
            open={mobileWeightsOpen}
            onToggle={(e) => setMobileWeightsOpen(e.currentTarget.open)}
            className="group relative z-10 rounded-2xl border border-border bg-card ring-1 ring-border/60 open:z-20"
          >
            <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2.5 text-left outline-none select-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                weights
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-[11px] font-medium capitalize text-foreground">
                {weightSummaryLabel}
              </span>
              <ChevronDown
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-xl border border-border bg-card p-2 shadow-lg ring-1 ring-border/60">
              {weightsToggleGroup("panel")}
            </div>
          </details>
        </div>

        <div className="mb-4 hidden w-full min-w-0 items-center gap-3 md:flex md:flex-nowrap">
          <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {roleToggleGroup}
          </div>

          <div role="presentation" className="h-7 w-px shrink-0 bg-border" aria-hidden />

          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <Label className="shrink-0 text-[10px] text-muted-foreground">weights</Label>
            {weightsToggleGroup("toolbar")}
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl py-0 ring-1 ring-border">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="border-b border-border bg-secondary/40 hover:bg-secondary/40">
                <TableHead className={stickyCandidateHead}>candidate</TableHead>
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
              {visibleRows.map((r, i) => (
                <MotionTableRow
                  key={r.scoreId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onSelectScore(r.scoreId)}
                  className={cn(rowCn, "group")}
                >
                  <TableCell className={stickyCandidateCell}>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-6 rounded-full">
                        <AvatarImage src={avatarUrl(r.slug)} alt={r.fullName} />
                        <AvatarFallback className="text-[10px]">{r.fullName.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-foreground group-hover:underline">
                        {r.fullName.toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="text-xs text-foreground">{r.headline.toLowerCase()}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.stacks.slice(0, 3).join(" · ").toLowerCase()}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {r.companyLogoUrl && (
                        <Avatar className="size-3.5 rounded-full">
                          <AvatarImage src={r.companyLogoUrl} alt={r.currentCompany ?? ""} />
                          <AvatarFallback className="text-[7px]">
                            {(r.currentCompany ?? "—").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {(r.currentCompany ?? "—").toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <MatchBar score={Math.round(r.finalScore)} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={r.githubSignal} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={r.blogSignal} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={r.networkProximity} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <SignalCell value={r.ossContributions} />
                  </TableCell>
                </MotionTableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </motion.div>
    </div>
  );
}
