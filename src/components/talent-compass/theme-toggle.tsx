import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function TalentThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      className="fixed top-4 right-4 z-50 size-8 rounded-full shadow-sm sm:top-6 sm:right-6"
      aria-label="Toggle color theme"
      onClick={() => {
        const dark = document.documentElement.classList.contains("dark")
        setTheme(dark ? "light" : "dark")
      }}
    >
      <Moon className="size-3.5 dark:hidden" />
      <Sun className="hidden size-3.5 dark:inline" />
    </Button>
  )
}
