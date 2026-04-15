export type ConnectionChannel =
  | "github"
  | "twitter"
  | "slack"
  | "conference"
  | "company"
  | "university"
  | "oss"
export type TieStrength = "strong" | "medium" | "weak"

export interface Connection {
  id: string
  name: string
  avatar: string
  role: string
  channels: { type: ConnectionChannel; detail: string }[]
  strength: TieStrength
  lastInteraction: string
  sharedProjects: number
  relationship: string
}

export interface Candidate {
  id: string
  name: string
  avatar: string
  role: string
  company: string
  companyLogo: string
  stack: string[]
  matchScore: number
  githubSignal: number
  blogSignal: number
  networkProximity: number
  ossContributions: number
  location: string
  github: string
  blog: string
  twitter: string
  summary: string
  matchBreakdown: { label: string; score: number }[]
  repos: {
    name: string
    url: string
    description: string
    stars: number
    relevance: string
  }[]
  blogPosts: { title: string; url: string; excerpt: string; date: string }[]
  communitySignals: string[]
  connections: Connection[]
}

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`
const logo = (name: string) => `https://logo.clearbit.com/${name}`

export const candidates: Candidate[] = [
  {
    id: "1",
    name: "Aria Chen",
    avatar: avatarUrl("aria"),
    role: "Senior Backend Engineer",
    company: "ex-Stripe",
    companyLogo: logo("stripe.com"),
    stack: ["Rust", "Go", "PostgreSQL", "Kafka"],
    matchScore: 94,
    githubSignal: 91,
    blogSignal: 88,
    networkProximity: 72,
    ossContributions: 96,
    location: "San Francisco, CA",
    github: "github.com/ariachen",
    blog: "ariachen.dev",
    twitter: "@ariachen_dev",
    summary:
      "Systems engineer with deep expertise in distributed databases. Core contributor to TiKV and author of a popular Rust async runtime tutorial series.",
    matchBreakdown: [
      { label: "Technical Fit", score: 96 },
      { label: "Domain Expertise", score: 92 },
      { label: "OSS Activity", score: 95 },
      { label: "Culture Signals", score: 88 },
      { label: "Network Proximity", score: 72 },
    ],
    repos: [
      {
        name: "async-raft",
        url: "#",
        description: "Production-grade Raft consensus implementation in Rust",
        stars: 2400,
        relevance: "Distributed systems expertise directly applicable",
      },
      {
        name: "pgwire-rs",
        url: "#",
        description: "PostgreSQL wire protocol implementation",
        stars: 890,
        relevance: "Deep understanding of database internals",
      },
      {
        name: "stream-processor",
        url: "#",
        description: "High-throughput event stream processing engine",
        stars: 1200,
        relevance: "Kafka-like system design experience",
      },
    ],
    blogPosts: [
      {
        title: "Building a Distributed Database from Scratch",
        url: "#",
        excerpt:
          "In this series, I walk through the architecture decisions behind building a horizontally scalable database...",
        date: "2024-11-15",
      },
      {
        title: "Why Rust's Ownership Model Matters for Databases",
        url: "#",
        excerpt:
          "Memory safety isn't just about preventing bugs — it fundamentally changes how you design concurrent systems...",
        date: "2024-09-22",
      },
    ],
    communitySignals: [
      "Spoke at RustConf 2024",
      "Mentor at Recurse Center",
      "Active in CNCF Slack",
    ],
    connections: [
      {
        id: "c1",
        name: "Jake Torres",
        avatar: avatarUrl("jake"),
        role: "staff engineer @ stripe",
        channels: [
          { type: "company", detail: "worked together at stripe" },
          { type: "github", detail: "co-maintained internal tools" },
        ],
        strength: "strong",
        lastInteraction: "2 weeks ago",
        sharedProjects: 4,
        relationship: "former colleague",
      },
      {
        id: "c2",
        name: "Priya Sharma",
        avatar: avatarUrl("priya"),
        role: "researcher @ berkeley",
        channels: [
          { type: "conference", detail: "rustconf 2024" },
          { type: "oss", detail: "co-authored tikv rfc" },
        ],
        strength: "medium",
        lastInteraction: "1 month ago",
        sharedProjects: 2,
        relationship: "oss collaborator",
      },
    ],
  },
  {
    id: "2",
    name: "Marcus Webb",
    avatar: avatarUrl("marcus"),
    role: "Full Stack Engineer",
    company: "ex-Vercel",
    companyLogo: logo("vercel.com"),
    stack: ["TypeScript", "React", "Node.js", "AWS"],
    matchScore: 89,
    githubSignal: 85,
    blogSignal: 92,
    networkProximity: 65,
    ossContributions: 78,
    location: "Austin, TX",
    github: "github.com/marcuswebb",
    blog: "marcuswebb.io",
    twitter: "@mwebb_dev",
    summary:
      "Prolific technical writer and full-stack engineer. Built multiple developer tools used by thousands.",
    matchBreakdown: [
      { label: "Technical Fit", score: 88 },
      { label: "Domain Expertise", score: 85 },
      { label: "OSS Activity", score: 78 },
      { label: "Culture Signals", score: 94 },
      { label: "Network Proximity", score: 65 },
    ],
    repos: [
      {
        name: "devtools-kit",
        url: "#",
        description: "Chrome extension framework for developer tools",
        stars: 3100,
        relevance: "DX-focused engineering mindset",
      },
      {
        name: "api-bench",
        url: "#",
        description: "API performance benchmarking suite",
        stars: 670,
        relevance: "Performance-oriented backend work",
      },
    ],
    blogPosts: [
      {
        title: "The Architecture of Real-Time Collaborative Editors",
        url: "#",
        excerpt:
          "CRDTs vs OT — a practical guide to choosing the right approach...",
        date: "2024-10-08",
      },
    ],
    communitySignals: [
      "Newsletter with 12k subscribers",
      "Guest on Syntax.fm podcast",
    ],
    connections: [
      {
        id: "c3",
        name: "Lisa Park",
        avatar: avatarUrl("lisa"),
        role: "pm @ vercel",
        channels: [
          { type: "company", detail: "vercel team" },
          { type: "twitter", detail: "mutual followers" },
        ],
        strength: "strong",
        lastInteraction: "3 days ago",
        sharedProjects: 6,
        relationship: "close colleague",
      },
    ],
  },
  {
    id: "3",
    name: "Yuki Tanaka",
    avatar: avatarUrl("yuki"),
    role: "ML Infrastructure Engineer",
    company: "ex-Google DeepMind",
    companyLogo: logo("deepmind.google"),
    stack: ["Python", "PyTorch", "Kubernetes", "Ray"],
    matchScore: 87,
    githubSignal: 93,
    blogSignal: 71,
    networkProximity: 58,
    ossContributions: 89,
    location: "Tokyo, Japan",
    github: "github.com/yukitanaka",
    blog: "yuki.codes",
    twitter: "@yuki_ml",
    summary:
      "ML infra specialist who bridges the gap between research and production. Contributor to Ray and MLflow.",
    matchBreakdown: [
      { label: "Technical Fit", score: 90 },
      { label: "Domain Expertise", score: 94 },
      { label: "OSS Activity", score: 89 },
      { label: "Culture Signals", score: 75 },
      { label: "Network Proximity", score: 58 },
    ],
    repos: [
      {
        name: "model-serve",
        url: "#",
        description: "Zero-config model serving framework",
        stars: 1800,
        relevance: "Production ML deployment expertise",
      },
    ],
    blogPosts: [
      {
        title: "Scaling ML Inference to 1M req/s",
        url: "#",
        excerpt:
          "How we architected our serving layer to handle massive throughput...",
        date: "2024-08-12",
      },
    ],
    communitySignals: ["PyTorch contributor", "Spoke at MLSys 2024"],
    connections: [
      {
        id: "c4",
        name: "David Kim",
        avatar: avatarUrl("david"),
        role: "founder @ mlops startup",
        channels: [
          { type: "conference", detail: "yc batchmates" },
          { type: "slack", detail: "mlops community" },
        ],
        strength: "medium",
        lastInteraction: "2 weeks ago",
        sharedProjects: 1,
        relationship: "yc batchmates",
      },
      {
        id: "c5",
        name: "Sato Kenji",
        avatar: avatarUrl("sato"),
        role: "professor @ tokyo univ",
        channels: [
          { type: "university", detail: "research lab" },
          { type: "oss", detail: "ray contributor" },
        ],
        strength: "strong",
        lastInteraction: "1 week ago",
        sharedProjects: 3,
        relationship: "research advisor",
      },
    ],
  },
  {
    id: "4",
    name: "Fatima Al-Rashid",
    avatar: avatarUrl("fatima"),
    role: "Platform Engineer",
    company: "ex-Datadog",
    companyLogo: logo("datadoghq.com"),
    stack: ["Terraform", "Go", "Kubernetes", "AWS"],
    matchScore: 82,
    githubSignal: 79,
    blogSignal: 85,
    networkProximity: 91,
    ossContributions: 74,
    location: "London, UK",
    github: "github.com/fatimar",
    blog: "fatima.engineering",
    twitter: "@fatima_eng",
    summary:
      "Platform engineering lead focused on developer experience. Built internal platforms serving 500+ engineers.",
    matchBreakdown: [
      { label: "Technical Fit", score: 80 },
      { label: "Domain Expertise", score: 85 },
      { label: "OSS Activity", score: 74 },
      { label: "Culture Signals", score: 88 },
      { label: "Network Proximity", score: 91 },
    ],
    repos: [
      {
        name: "kube-toolkit",
        url: "#",
        description: "Kubernetes operator development framework",
        stars: 920,
        relevance: "Platform engineering expertise",
      },
    ],
    blogPosts: [],
    communitySignals: [
      "KubeCon speaker",
      "Platform Engineering Slack moderator",
    ],
    connections: [
      {
        id: "c6",
        name: "You",
        avatar: avatarUrl("you"),
        role: "",
        channels: [{ type: "conference", detail: "met at kubecon" }],
        strength: "weak",
        lastInteraction: "3 months ago",
        sharedProjects: 0,
        relationship: "met at kubecon",
      },
    ],
  },
  {
    id: "5",
    name: "Noah Eriksen",
    avatar: avatarUrl("noah"),
    role: "Frontend Architect",
    company: "ex-Figma",
    companyLogo: logo("figma.com"),
    stack: ["TypeScript", "React", "WebGL", "Figma API"],
    matchScore: 79,
    githubSignal: 82,
    blogSignal: 76,
    networkProximity: 45,
    ossContributions: 88,
    location: "Copenhagen, Denmark",
    github: "github.com/noaheriksen",
    blog: "noah.design",
    twitter: "@noah_ui",
    summary:
      "Design engineer building at the intersection of code and creativity. Created several popular React animation libraries.",
    matchBreakdown: [
      { label: "Technical Fit", score: 82 },
      { label: "Domain Expertise", score: 76 },
      { label: "OSS Activity", score: 88 },
      { label: "Culture Signals", score: 80 },
      { label: "Network Proximity", score: 45 },
    ],
    repos: [
      {
        name: "motion-primitives",
        url: "#",
        description: "Physics-based animation primitives for React",
        stars: 4200,
        relevance: "Advanced frontend architecture",
      },
    ],
    blogPosts: [],
    communitySignals: ["React Summit speaker", "Design Systems Slack"],
    connections: [
      {
        id: "c7",
        name: "Emma Olsen",
        avatar: avatarUrl("emma"),
        role: "designer @ figma",
        channels: [
          { type: "twitter", detail: "mutual followers" },
          { type: "company", detail: "figma alumni" },
        ],
        strength: "medium",
        lastInteraction: "1 month ago",
        sharedProjects: 2,
        relationship: "twitter mutuals",
      },
      {
        id: "c8",
        name: "Kai Müller",
        avatar: avatarUrl("kai"),
        role: "engineer @ linear",
        channels: [
          { type: "conference", detail: "react summit co-speaker" },
          { type: "oss", detail: "framer-motion contributors" },
        ],
        strength: "weak",
        lastInteraction: "4 months ago",
        sharedProjects: 1,
        relationship: "conference co-speaker",
      },
    ],
  },
  {
    id: "6",
    name: "Zara Okonkwo",
    avatar: avatarUrl("zara"),
    role: "Security Engineer",
    company: "ex-Cloudflare",
    companyLogo: logo("cloudflare.com"),
    stack: ["Rust", "C", "Linux", "eBPF"],
    matchScore: 76,
    githubSignal: 88,
    blogSignal: 69,
    networkProximity: 52,
    ossContributions: 91,
    location: "Lagos, Nigeria",
    github: "github.com/zaraokonkwo",
    blog: "zara.security",
    twitter: "@zara_sec",
    summary:
      "Low-level security researcher. Built eBPF-based runtime security tools. Active in the Linux kernel community.",
    matchBreakdown: [
      { label: "Technical Fit", score: 78 },
      { label: "Domain Expertise", score: 82 },
      { label: "OSS Activity", score: 91 },
      { label: "Culture Signals", score: 70 },
      { label: "Network Proximity", score: 52 },
    ],
    repos: [],
    blogPosts: [],
    communitySignals: ["Linux kernel contributor", "DEF CON presenter"],
    connections: [
      {
        id: "c9",
        name: "James Liu",
        avatar: avatarUrl("james"),
        role: "security lead @ meta",
        channels: [
          { type: "conference", detail: "def con" },
          { type: "slack", detail: "infosec community" },
        ],
        strength: "medium",
        lastInteraction: "6 weeks ago",
        sharedProjects: 1,
        relationship: "hackathon team",
      },
      {
        id: "c10",
        name: "Amara Diallo",
        avatar: avatarUrl("amara"),
        role: "phd student @ eth zurich",
        channels: [{ type: "university", detail: "university peers" }],
        strength: "weak",
        lastInteraction: "5 months ago",
        sharedProjects: 0,
        relationship: "university peers",
      },
    ],
  },
  {
    id: "7",
    name: "Liam O'Sullivan",
    avatar: avatarUrl("liam"),
    role: "Data Engineer",
    company: "ex-Snowflake",
    companyLogo: logo("snowflake.com"),
    stack: ["Spark", "Python", "dbt", "Snowflake"],
    matchScore: 73,
    githubSignal: 71,
    blogSignal: 80,
    networkProximity: 68,
    ossContributions: 65,
    location: "Dublin, Ireland",
    github: "github.com/liamodev",
    blog: "liam.data",
    twitter: "@liam_data",
    summary:
      "Data platform engineer who's built pipelines processing 10TB+ daily. Strong technical writing presence.",
    matchBreakdown: [
      { label: "Technical Fit", score: 75 },
      { label: "Domain Expertise", score: 78 },
      { label: "OSS Activity", score: 65 },
      { label: "Culture Signals", score: 76 },
      { label: "Network Proximity", score: 68 },
    ],
    repos: [],
    blogPosts: [],
    communitySignals: ["dbt community contributor", "Data Council speaker"],
    connections: [
      {
        id: "c11",
        name: "Sarah Murphy",
        avatar: avatarUrl("sarah"),
        role: "eng manager @ snowflake",
        channels: [
          { type: "company", detail: "snowflake team" },
          { type: "slack", detail: "data engineering slack" },
        ],
        strength: "strong",
        lastInteraction: "1 week ago",
        sharedProjects: 5,
        relationship: "former manager",
      },
    ],
  },
  {
    id: "8",
    name: "Sofia Reyes",
    avatar: avatarUrl("sofia"),
    role: "DevRel Engineer",
    company: "ex-Vercel",
    companyLogo: logo("vercel.com"),
    stack: ["TypeScript", "Python", "GraphQL", "Next.js"],
    matchScore: 68,
    githubSignal: 74,
    blogSignal: 95,
    networkProximity: 83,
    ossContributions: 72,
    location: "Mexico City, Mexico",
    github: "github.com/sofiareyes",
    blog: "sofia.tech",
    twitter: "@sofia_codes",
    summary:
      "Developer advocate with engineering depth. Runs a popular YouTube channel on system design. Previously at Vercel.",
    matchBreakdown: [
      { label: "Technical Fit", score: 70 },
      { label: "Domain Expertise", score: 65 },
      { label: "OSS Activity", score: 72 },
      { label: "Culture Signals", score: 90 },
      { label: "Network Proximity", score: 83 },
    ],
    repos: [],
    blogPosts: [],
    communitySignals: ["YouTube channel with 45k subs", "Next.js contributor"],
    connections: [
      {
        id: "c12",
        name: "You",
        avatar: avatarUrl("you"),
        role: "",
        channels: [
          { type: "twitter", detail: "dm friends" },
          { type: "conference", detail: "next.js conf" },
        ],
        strength: "medium",
        lastInteraction: "2 weeks ago",
        sharedProjects: 0,
        relationship: "twitter dm friends",
      },
    ],
  },
]
