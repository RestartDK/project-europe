export type ConnectionChannel =
  | "github"
  | "twitter"
  | "slack"
  | "conference"
  | "company"
  | "university"
  | "oss";

export type TieStrength = "strong" | "medium" | "weak";

export interface NetworkConnection {
  id: string;
  name: string;
  avatar: string;
  role: string;
  channels: Array<{ type: ConnectionChannel; detail: string }>;
  strength: TieStrength;
  lastInteraction: string;
  sharedProjects: number;
  relationship: string;
}
