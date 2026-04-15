import { cn } from "@/lib/utils";

const WEEKS = 52;
const DAYS = 7;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

const levelClass: Record<number, string> = {
  0: "bg-muted/80",
  1: "bg-foreground/15",
  2: "bg-foreground/35",
  3: "bg-foreground/55",
  4: "bg-foreground/75",
};

type Props = {
  /** Stable per-candidate string (e.g. slug) so the pattern stays consistent. */
  seed: string;
  className?: string;
};

/**
 * GitHub-style contribution grid. Activity levels are synthetic (deterministic from `seed`)
 * for layout preview until real commit data is wired in.
 */
export function GithubCommitGraph({ seed, className }: Props) {
  const rand = mulberry32(hashSeed(seed));
  const grid: number[][] = [];
  for (let d = 0; d < DAYS; d++) {
    const row: number[] = [];
    for (let w = 0; w < WEEKS; w++) {
      const v = rand();
      let level = 0;
      if (v > 0.52) level = 1;
      if (v > 0.74) level = 2;
      if (v > 0.88) level = 3;
      if (v > 0.96) level = 4;
      row.push(level);
    }
    grid.push(row);
  }

  const dayLabels = ["", "mon", "", "wed", "", "fri", ""];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex shrink-0 flex-col gap-y-[3px] pt-[22px] pr-1 text-[9px] capitalize text-muted-foreground">
          {dayLabels.map((label, i) => (
            <div key={i} className="flex h-[11px] items-center leading-none">
              {label}
            </div>
          ))}
        </div>
        <div
          className="grid min-w-0 gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 11px))`,
            gridTemplateRows: `repeat(${DAYS}, 11px)`,
          }}
        >
          {grid.flatMap((row, d) =>
            row.map((level, w) => (
              <div
                key={`${d}-${w}`}
                className={cn("size-[11px] rounded-sm", levelClass[level] ?? levelClass[0])}
                title={`activity level ${level}`}
              />
            )),
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 text-[9px] text-muted-foreground">
        <span>less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((lv) => (
            <div key={lv} className={cn("size-[11px] rounded-sm", levelClass[lv])} />
          ))}
        </div>
        <span>more</span>
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        illustrative year of activity (deterministic placeholder until live GitHub data is connected).
      </p>
    </div>
  );
}
