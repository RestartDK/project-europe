import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const sharpeningQuestions = [
  "remote-friendly?",
  "senior+ only?",
  "open to relocation?",
  "active oss preferred?",
  "startup exp matters?",
]

type Props = {
  onStartDiscovery: () => void
}

export function ContextScreen({ onStartDiscovery }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [company, setCompany] = useState("")
  const [lookingFor, setLookingFor] = useState("")
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set())

  const toggleChip = (q: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev)
      if (next.has(q)) {
        next.delete(q)
      } else {
        next.add(q)
      }
      return next
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            find your next hire
          </h1>
          <p className="text-sm text-muted-foreground">
            scanning the open internet to find matches
          </p>
        </div>

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
                onChange={(e) => setCompany(e.target.value)}
              />
              <Button
                type="button"
                className="w-full rounded-full text-xs"
                disabled={!company.trim()}
                onClick={() => setStep(2)}
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
                onChange={(e) => setLookingFor(e.target.value)}
              />

              <div>
                <p className="mb-2 text-[10px] text-muted-foreground">
                  sharpen
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sharpeningQuestions.map((q) => (
                    <Button
                      key={q}
                      type="button"
                      size="sm"
                      variant={selectedChips.has(q) ? "default" : "secondary"}
                      className="h-8 rounded-full px-3 text-[11px] font-medium"
                      onClick={() => toggleChip(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className="mt-1 w-full rounded-full text-xs"
                disabled={!lookingFor.trim()}
                onClick={onStartDiscovery}
              >
                start discovery →
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
