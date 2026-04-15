import { Globe } from "lucide-react";

import { cn } from "@/lib/utils";

/** Mirrors `deriveInfoSources` in convex/lib/infoSources.ts */
export type InfoSourceId =
  | "linkedin"
  | "github"
  | "x"
  | "website"
  | "reddit"
  | "youtube";

const iconInner = "size-3 shrink-0 text-muted-foreground";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconInner, className)} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconInner, className)} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconInner, className)} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconInner, className)} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.731-1.485l.893-4.111a.343.343 0 0 1 .107-.205.348.348 0 0 1 .24-.096l2.815.396a1.13 1.13 0 0 1 .315-.078 1.161 1.161 0 1 1-.021 2.016zm-6.585 11.145a.961.961 0 0 1-1.92-.002.961.961 0 0 1 1.92.002zm6.31.063a.96.96 0 1 1 .019-1.922.96.96 0 0 1-.02 1.922zM8.16 12.095a.96.96 0 1 1-1.922-.002.96.96 0 0 1 1.922.002z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconInner, className)} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const LABELS: Record<InfoSourceId, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  x: "X",
  website: "Website",
  reddit: "Reddit",
  youtube: "YouTube",
};

function iconFor(id: InfoSourceId) {
  switch (id) {
    case "linkedin":
      return <LinkedInIcon />;
    case "github":
      return <GitHubIcon />;
    case "x":
      return <XIcon />;
    case "reddit":
      return <RedditIcon />;
    case "youtube":
      return <YouTubeIcon />;
    case "website":
      return <Globe className={cn(iconInner)} strokeWidth={2} />;
    default:
      return null;
  }
}

export function InfoSourceIcons({
  sources,
  className,
}: {
  sources: InfoSourceId[];
  className?: string;
}) {
  if (sources.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground tabular-nums">—</span>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-nowrap items-center justify-end pr-0.5",
        className,
      )}
    >
      {sources.map((id, i) => (
        <span
          key={id}
          title={LABELS[id]}
          className={cn(
            "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full",
            "border-2 border-card bg-muted/90 text-muted-foreground",
            "transition-[border-color,background-color] duration-150",
            "group-hover:border-secondary/40 group-hover:bg-muted",
            i > 0 && "-ml-2.5",
          )}
          style={{ zIndex: i }}
        >
          {iconFor(id)}
        </span>
      ))}
    </div>
  );
}
