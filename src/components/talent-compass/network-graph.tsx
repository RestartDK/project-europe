import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";

import type { NetworkConnection } from "@/types/network";

const channelIcon: Record<NetworkConnection["channels"][number]["type"], string> = {
  github: "⌘",
  twitter: "𝕏",
  slack: "#",
  conference: "◉",
  company: "◆",
  university: "▲",
  oss: "⚡",
};

const strengthStroke: Record<string, { width: number; opacity: number }> = {
  strong: { width: 2.5, opacity: 0.6 },
  medium: { width: 1.5, opacity: 0.35 },
  weak: { width: 1, opacity: 0.18 },
};

export type NetworkGraphTarget = {
  avatar: string;
  name: string;
};

type Props = {
  candidate: NetworkGraphTarget;
  connections: NetworkConnection[];
};

export function NetworkGraph({ candidate, connections }: Props) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const youAvatarUrl = "https://api.dicebear.com/7.x/notionists/svg?seed=you";

  const layout = useMemo(() => {
    const w = 520;
    const h = Math.max(200, 80 + connections.length * 60);
    const you = { x: 60, y: h / 2 };
    const target = { x: w - 60, y: h / 2 };

    const connectorPositions = connections.map((_, i) => {
      const total = connections.length;
      const spacing = Math.min(60, (h - 80) / Math.max(total - 1, 1));
      const startY = h / 2 - ((total - 1) * spacing) / 2;
      return { x: w / 2, y: startY + i * spacing };
    });

    return { w, h, you, target, connectorPositions };
  }, [connections]);

  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${layout.w} ${layout.h}`}
        className="w-full"
        style={{ minWidth: 360, maxHeight: 320 }}
      >
        {connections.map((conn, i) => {
          const s = strengthStroke[conn.strength];
          const cp = layout.connectorPositions[i];
          const isHovered = hoveredNode === conn.id;
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
          );
        })}

        {connections.map((conn, i) => {
          const s = strengthStroke[conn.strength];
          const cp = layout.connectorPositions[i];
          const isHovered = hoveredNode === conn.id;
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
          );
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
          const cp = layout.connectorPositions[i];
          const isHovered = hoveredNode === conn.id;
          const clipId = `conn-clip-${conn.id}`;
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
                {conn.name.split(" ")[0]?.toLowerCase() ?? ""}
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
          );
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
            {candidate.name.split(" ")[0]?.toLowerCase() ?? ""}
          </text>
        </motion.g>
      </svg>
    </div>
  );
}
