export default function getScore(questionsAnswered: QA[]): number {
  return helper(questionsAnswered[0]?.timestampMs, questionsAnswered);
}

type QA = {
  difficultyZeroToOne: number; // 0 = trivial, 1 = impossible
  isCorrect: number; // 1 or 0
  timestampMs: number;
};

/**
 * Bayesian Beta aggregator with per-question weights.
 * Prior = Beta(1,1) => start at 0.5
 *
 * Weighting:
 *  - baseWeight = timeDecay * diffScale
 *  - correct adds to alpha; incorrect adds to beta
 *  - hard-correct counts more; easy-incorrect counts more
 */
function helper(currentTimestampMs: number, questionsAnswered: QA[]): number {
  if (questionsAnswered.length === 0) return 0.5;

  // --- Tunables ---
  const HALF_LIFE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days half-life
  const DIFF_MIN = 0.3; // baseline weight at difficulty=0
  const DIFF_MAX = 1.0; // baseline weight at difficulty=1
  const HARD_BONUS = 1.0; // how much difficulty skews outcome weight
  const MIN_P = 0.05; // clamp expected success rate
  const MAX_P = 0.95;

  // Beta prior -> start at 0.5 and stabilize with more data
  let alpha = 1; // successes
  let beta = 1; // failures

  for (const q of questionsAnswered) {
    const d = clamp01(q.difficultyZeroToOne);
    const age = Math.max(0, currentTimestampMs - q.timestampMs);

    // Recency: exponential decay
    const decay = Math.exp(-age / HALF_LIFE_MS);

    // Difficulty scale: harder questions have higher baseline weight
    const diffScale = DIFF_MIN + (DIFF_MAX - DIFF_MIN) * d; // ∈ [0.3, 1.0]

    // Combine into a per-item base weight
    const baseWeight = diffScale * decay;

    // Baseline expected correctness for this difficulty
    // Easy (d≈0) → q≈0.95 ; Hard (d≈1) → q≈0.05
    const qExp = clamp(MIN_P, 1 - d, MAX_P);

    if (q.isCorrect) {
      // Correct on hard items (small qExp) gets a bigger bump
      const w = baseWeight * (0.5 + HARD_BONUS * (1 - qExp));
      alpha += w;
    } else {
      // Incorrect on easy items (large qExp) gets a bigger penalty
      const w = baseWeight * (0.5 + HARD_BONUS * qExp);
      beta += w;
    }
  }

  // Posterior mean of Beta(alpha, beta)
  const score = alpha / (alpha + beta);
  return clamp01(score);
}

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function clamp(lo: number, x: number, hi: number) {
  return x < lo ? lo : x > hi ? hi : x;
}
