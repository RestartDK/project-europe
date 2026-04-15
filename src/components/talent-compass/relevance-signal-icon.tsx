import {
  BadgeCheck,
  BookOpen,
  Eye,
  GitFork,
  Heart,
  MessageCircle,
  Signal,
  Star,
  ThumbsUp,
} from "lucide-react";

import {
  deriveDossierEvidenceSource,
  MetricBrandGitHub,
  MetricBrandLinkedIn,
  MetricBrandReddit,
  MetricBrandYouTube,
} from "@/components/talent-compass/info-source-icons";
import { cn } from "@/lib/utils";

type EvidenceKind = "repo" | "blog" | "talk" | "community" | "employment" | "network";

type MetricVisual =
  | "github_star"
  | "github_fork"
  | "reddit_thumb"
  | "reddit_brand"
  | "youtube_brand"
  | "linkedin_brand"
  | "linkedin_verify"
  | "heart"
  | "eye_views"
  | "blog_read"
  | "comments"
  | "x_heart"
  | "signal";

function resolveMetricVisual(
  url: string | undefined,
  kind: EvidenceKind,
  relevanceDisplay: string | undefined,
): MetricVisual {
  const d = (relevanceDisplay ?? "").toLowerCase();
  const u = (url ?? "").toLowerCase();
  const src = deriveDossierEvidenceSource(url, kind);

  if (d.includes("upvote")) return "reddit_thumb";
  if (d.includes("fork")) return "github_fork";
  if (d.includes("star")) return "github_star";
  if (d.includes("comment")) return "comments";
  if (d.includes("reaction")) return "heart";
  if (d.includes("endorse") || d.includes("skills endor")) return "linkedin_verify";
  if (d.includes("view") || d.includes("views")) {
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube_brand";
    return "eye_views";
  }
  if (d.includes("read") || d.includes("subscriber")) return "blog_read";

  if (src === "github") return "github_star";
  if (src === "reddit") return "reddit_brand";
  if (src === "youtube") return "youtube_brand";
  if (src === "linkedin") return "linkedin_brand";
  if (src === "x") return "x_heart";
  if (src === "website" && kind === "blog") return "blog_read";

  return "signal";
}

const lucideBase = "size-3.5 shrink-0";

export function RelevanceSignalIcon({
  url,
  kind,
  relevanceDisplay,
  className,
}: {
  url: string | undefined;
  kind: EvidenceKind;
  relevanceDisplay: string | undefined;
  className?: string;
}) {
  const metric = resolveMetricVisual(url, kind, relevanceDisplay);

  switch (metric) {
    case "github_star":
      return (
        <span className={cn("inline-flex shrink-0 items-center gap-0.5", className)} aria-hidden>
          <MetricBrandGitHub className="size-3 opacity-90" />
          <Star
            className={cn(
              "size-3 shrink-0 fill-amber-400/90 stroke-amber-600/70 text-amber-500",
            )}
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      );
    case "github_fork":
      return <GitFork className={cn(lucideBase, "text-muted-foreground", className)} strokeWidth={2} aria-hidden />;
    case "reddit_thumb":
      return (
        <span className={cn("inline-flex shrink-0 items-center gap-0.5", className)} aria-hidden>
          <MetricBrandReddit className="size-3" />
          <ThumbsUp
            className="size-3 shrink-0 fill-[#FF4500]/20 text-[#FF4500]"
            strokeWidth={2}
            aria-hidden
          />
        </span>
      );
    case "reddit_brand":
      return <MetricBrandReddit className={className} />;
    case "youtube_brand":
      return <MetricBrandYouTube className={className} />;
    case "linkedin_brand":
      return <MetricBrandLinkedIn className={className} />;
    case "linkedin_verify":
      return (
        <span className={cn("inline-flex shrink-0 items-center gap-0.5", className)} aria-hidden>
          <MetricBrandLinkedIn className="size-3" />
          <BadgeCheck className="size-3 shrink-0 text-[#0A66C2]" strokeWidth={2} aria-hidden />
        </span>
      );
    case "heart":
      return (
        <Heart
          className={cn(lucideBase, "fill-rose-500/25 text-rose-500", className)}
          strokeWidth={2}
          aria-hidden
        />
      );
    case "x_heart":
      return (
        <Heart
          className={cn(lucideBase, "fill-foreground/10 text-foreground", className)}
          strokeWidth={2}
          aria-hidden
        />
      );
    case "eye_views":
      return <Eye className={cn(lucideBase, "text-muted-foreground", className)} strokeWidth={2} aria-hidden />;
    case "blog_read":
      return <BookOpen className={cn(lucideBase, "text-muted-foreground", className)} strokeWidth={2} aria-hidden />;
    case "comments":
      return (
        <MessageCircle
          className={cn(lucideBase, "text-muted-foreground", className)}
          strokeWidth={2}
          aria-hidden
        />
      );
    case "signal":
    default:
      return <Signal className={cn(lucideBase, "text-muted-foreground", className)} strokeWidth={2} aria-hidden />;
  }
}
