import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

const steps = [
  "scanning github…",
  "reading blog posts…",
  "analyzing oss contributions…",
  "evaluating technical depth…",
  "mapping network…",
  "scoring relevance…",
]

type Props = {
  onBack: () => void
  onComplete: () => void
}

export function DiscoveryScreen({ onBack, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length)
    }, 1800)

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          clearInterval(stepInterval)
          setTimeout(onComplete, 400)
          return 100
        }
        return prev + 1.5
      })
    }, 80)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [onComplete])

  return (
    <div className="flex min-h-screen flex-col px-4 pt-6 pb-8 sm:px-6 sm:pt-8">
      <header className="mx-auto mb-6 w-full max-w-6xl text-left">
        <Button
          type="button"
          variant="ghost"
          className="-ml-2 h-8 justify-start rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          ← edit criteria
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
      <Card className="w-full max-w-sm border-none bg-transparent py-0 shadow-none ring-0">
        <CardContent className="px-0">
          <motion.div
            className="w-full text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="mx-auto mb-8 flex size-3 items-center justify-center"
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Skeleton className="size-3 animate-none rounded-full bg-foreground/80" />
            </motion.div>

            <motion.p
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 text-xs text-muted-foreground"
            >
              {steps[currentStep]}
            </motion.p>

            <Progress
              value={Math.min(progress, 100)}
              className="h-1 bg-secondary [&_[data-slot=progress-indicator]]:bg-foreground/60"
            />
            <p className="mt-2 text-[10px] text-muted-foreground tabular-nums">
              {Math.min(Math.round(progress), 100)}%
            </p>
          </motion.div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
