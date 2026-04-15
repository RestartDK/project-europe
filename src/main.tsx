import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ConvexProvider, ConvexReactClient } from "convex/react"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

if (!convexUrl) {
  throw new Error(
    "Missing VITE_CONVEX_URL. Run `bunx convex dev` to configure Convex.",
  )
}

const convexClient = new ConvexReactClient(convexUrl)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convexClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ConvexProvider>
  </StrictMode>,
)
