import { useState } from "react";
import { motion } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

const strengthBadgeClass: Record<string, string> = {
  strong: "bg-foreground/15 text-foreground",
  medium: "bg-foreground/10 text-muted-foreground",
  weak: "bg-secondary text-muted-foreground/80",
};

type Props = {
  conn: NetworkConnection;
  candidateName: string;
};

export function ConnectionCard({ conn, candidateName }: Props) {
  const [showDraft, setShowDraft] = useState(false);

  const introMessage = `hey ${conn.name.split(" ")[0]?.toLowerCase() ?? ""},\n\ni came across ${candidateName.toLowerCase()}'s work and i'm really impressed.\n\nwould you be open to making an introduction? i'd love to chat with them about a role we're hiring for.\n\nthanks!`;

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
            <p className="text-[9px] text-muted-foreground">{conn.role.toLowerCase()}</p>

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
              {conn.sharedProjects > 0 && <span>{conn.sharedProjects} shared</span>}
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
                <Button type="button" size="sm" className="mt-1 rounded-full text-[9px]">
                  copy message
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
