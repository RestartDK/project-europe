import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ConvexProvider, ConvexReactClient } from "convex/react"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

if (!convexUrl && import.meta.env.DEV) {
  console.warn(
    "[project-europe] VITE_CONVEX_URL is not set. UI runs without Convex. Run `bunx convex dev` and set VITE_CONVEX_URL to connect the backend."
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {convexClient ? (
      <ConvexProvider client={convexClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ConvexProvider>
    ) : (
      <ThemeProvider>
        <App />
      </ThemeProvider>
    )}
  </StrictMode>
)
