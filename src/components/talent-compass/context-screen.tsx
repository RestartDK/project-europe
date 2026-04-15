import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const flowPrimaryButtonClassName =
  "h-11 w-full min-w-0 rounded-2xl px-5 text-sm font-semibold shadow-sm ring-1 ring-foreground/10 transition-[box-shadow,transform] hover:shadow-md hover:ring-foreground/15 active:translate-y-px"

const sharpeningQuestions = [
  "remote-friendly?",
  "senior+ only?",
  "open to relocation?",
  "active oss preferred?",
  "startup exp matters?",
]

type Props = {
  step: 1 | 2
  onStepChange: (step: 1 | 2) => void
  company: string
  onCompanyChange: (value: string) => void
  lookingFor: string
  onLookingForChange: (value: string) => void
  selectedChips: Set<string>
  onToggleChip: (q: string) => void
  onStartDiscovery: () => void
  errorMessage?: string | null
}

export function ContextScreen({
  step,
  onStepChange,
  company,
  onCompanyChange,
  lookingFor,
  onLookingForChange,
  selectedChips,
  onToggleChip,
  onStartDiscovery,
  errorMessage,
}: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 sm:px-10 md:px-12 lg:px-16">
      <motion.div
        className="w-full max-w-xl sm:max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-none bg-transparent py-0 shadow-none ring-0">
          <CardHeader className="px-0">
            <div className="space-y-1.5">
              <CardTitle className="font-heading text-2xl font-bold">
                find your next hire
              </CardTitle>
              <CardDescription>
                scanning the open internet to find matches
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {errorMessage && (
              <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                {errorMessage}
              </div>
            )}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Label htmlFor="company" className="text-sm font-semibold">
                describe your company
              </Label>
              <Textarea
                id="company"
                rows={4}
                className="min-h-24 rounded-2xl text-sm"
                placeholder="e.g. We're building developer tools for infrastructure teams. Series A, 30 engineers..."
                value={company}
                onChange={(e) => onCompanyChange(e.target.value)}
              />
              <Button
                type="button"
                className={flowPrimaryButtonClassName}
                disabled={!company.trim()}
                onClick={() => onStepChange(2)}
              >
                continue →
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Label htmlFor="looking" className="text-sm font-semibold">
                who are you looking for?
              </Label>
              <Textarea
                id="looking"
                rows={3}
                className="min-h-20 rounded-2xl text-sm"
                placeholder="e.g. Senior backend engineer, strong in Rust or Go, distributed systems..."
                value={lookingFor}
                onChange={(e) => onLookingForChange(e.target.value)}
              />

              <div>
                <CardDescription className="mb-2 text-[10px] font-medium">
                  sharpen
                </CardDescription>
                <div className="flex flex-wrap gap-1.5">
                  {sharpeningQuestions.map((q) => (
                    <Button
                      key={q}
                      type="button"
                      size="sm"
                      variant={selectedChips.has(q) ? "default" : "secondary"}
                      className="h-8 rounded-full px-3 text-[11px] font-medium"
                      onClick={() => onToggleChip(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className={cn("mt-1", flowPrimaryButtonClassName)}
                disabled={!lookingFor.trim()}
                onClick={onStartDiscovery}
              >
                start discovery →
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
