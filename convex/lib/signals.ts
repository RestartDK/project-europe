/** Derive UI signal columns (0–100) from evidence + factor breakdown. */
export function computeSignalColumns(
  evidence: Array<{ kind: string; strength: number }>,
  factorBreakdown: {
    roleFit: number;
    stackFit: number;
    domainFit: number;
    evidenceStrength: number;
    recency: number;
    signalConfidence: number;
    reachabilityBonus: number;
  },
): {
  githubSignal: number;
  blogSignal: number;
  networkProximity: number;
  ossContributions: number;
} {
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

  const avgStrength = (kinds: string[]) => {
    const list = evidence.filter((e) => kinds.includes(e.kind));
    if (list.length === 0) {
      return 0;
    }
    return list.reduce((s, e) => s + e.strength * 100, 0) / list.length;
  };

  const fb = factorBreakdown;

  const githubSignal = clamp(
    Math.max(
      avgStrength(["repo"]),
      fb.stackFit * 0.5 + fb.evidenceStrength * 0.5,
    ),
  );
  const blogSignal = clamp(
    Math.max(
      avgStrength(["blog"]),
      fb.domainFit * 0.45 + fb.evidenceStrength * 0.55,
    ),
  );
  const networkProximity = clamp(fb.reachabilityBonus);
  const ossContributions = clamp(
    Math.max(
      avgStrength(["community", "talk"]),
      fb.evidenceStrength * 0.55 + fb.stackFit * 0.45,
    ),
  );

  return { githubSignal, blogSignal, networkProximity, ossContributions };
}
