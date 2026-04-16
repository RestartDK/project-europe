import type { Doc } from "../_generated/dataModel"

export type EnrichmentStatus = "ready" | "queued" | "complete" | "failed"

type PersonEnrichmentShape = Pick<
  Doc<"people">,
  | "headline"
  | "summary"
  | "email"
  | "socialGithub"
  | "socialBlog"
  | "socialTwitter"
  | "clayEnriched"
> & {
  enrichmentStatus?: EnrichmentStatus
}

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0
}

export function isPersonReadyForImmediateDisplay(
  person: PersonEnrichmentShape
): boolean {
  if (!hasValue(person.headline)) {
    return false
  }

  return [
    person.summary,
    person.email,
    person.socialGithub,
    person.socialBlog,
    person.socialTwitter,
  ].some(hasValue)
}

export function getEffectiveEnrichmentStatus(
  person: PersonEnrichmentShape
): EnrichmentStatus {
  if (person.enrichmentStatus === "complete" || person.clayEnriched) {
    return "complete"
  }

  if (isPersonReadyForImmediateDisplay(person)) {
    return "ready"
  }

  if (person.enrichmentStatus === "failed") {
    return "failed"
  }

  return "queued"
}

export function shouldQueuePersonForClay(
  person: PersonEnrichmentShape
): boolean {
  const status = getEffectiveEnrichmentStatus(person)
  return status === "queued" || status === "failed"
}
