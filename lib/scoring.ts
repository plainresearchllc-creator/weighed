// The Weighed scoring model. Pure functions, shared by every page.
// Keep this file free of imports so it can be unit-tested with plain Node.

export interface ScoringSettings {
  base_expert_weight: number;   // expert share once a product has plenty of reviews (e.g. 0.6)
  max_expert_weight: number;    // expert share when reviews are scarce (e.g. 0.8)
  full_weight_reviews: number;  // reviews needed for the standard split (e.g. 500)
  min_weight_reviews: number;   // at or below this, use the max expert share (e.g. 100)
  disagreement_gap: number;     // points between experts and customers that trigger a flag (e.g. 1.5)
  min_ballots: number;          // expert ballots needed before a product is ranked (e.g. 3)
}

export const DEFAULT_SETTINGS: ScoringSettings = {
  base_expert_weight: 0.6,
  max_expert_weight: 0.8,
  full_weight_reviews: 500,
  min_weight_reviews: 100,
  disagreement_gap: 1.5,
  min_ballots: 3,
};

export const CRITERIA = [
  { key: 'evidence', label: 'Strength of evidence', short: 'Evid.' },
  { key: 'dosing', label: 'Dosing vs. research', short: 'Dose' },
  { key: 'transparency', label: 'Label transparency', short: 'Label' },
  { key: 'safety', label: 'Safety & tolerability', short: 'Safety' },
  { key: 'value', label: 'Value', short: 'Value' },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]['key'];

export interface BallotScores {
  evidence: number;
  dosing: number;
  transparency: number;
  safety: number;
  value: number;
}

export interface ProductInput {
  id: string;
  review_count: number;
  avg_rating: number | null;
}

export type Agreement =
  | { kind: 'agree'; label: 'Agree'; note: string }
  | { kind: 'mostly'; label: 'Mostly agree'; note: string }
  | { kind: 'disagree'; label: 'Disagree'; note: string };

export interface ScoreResult {
  expert: number | null;
  customer: number | null;
  expertWeight: number;
  total: number | null;
  ballotCount: number;
  reviewCount: number;
  provisional: boolean;
  agreement: Agreement | null;
  criteria: Record<CriterionKey, number | null>;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function ballotScore(b: BallotScores): number {
  return (b.evidence + b.dosing + b.transparency + b.safety + b.value) / 5;
}

/** Star average (1–5) to the 10-point scale: 1★ = 0, 3★ = 5, 5★ = 10. */
export function customerScore(avgRating: number | null, reviewCount: number): number | null {
  if (!reviewCount || avgRating == null) return null;
  return (Math.min(5, Math.max(1, avgRating)) - 1) * 2.5;
}

export function expertWeight(reviewCount: number, s: ScoringSettings): number {
  if (reviewCount >= s.full_weight_reviews) return s.base_expert_weight;
  if (reviewCount <= s.min_weight_reviews) return s.max_expert_weight;
  const span = Math.max(1, s.full_weight_reviews - s.min_weight_reviews);
  const t = (reviewCount - s.min_weight_reviews) / span;
  return s.max_expert_weight - t * (s.max_expert_weight - s.base_expert_weight);
}

export function fmt1(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? '–' : (Math.round(n * 10) / 10).toFixed(1);
}

export function scoreProduct(p: ProductInput, ballots: BallotScores[], s: ScoringSettings): ScoreResult {
  const scores = ballots.map(ballotScore);
  const expert = median(scores);
  const customer = customerScore(p.avg_rating, p.review_count);
  const w = customer == null ? 1 : expertWeight(p.review_count, s);
  const total = expert == null ? null : customer == null ? expert : expert * w + customer * (1 - w);

  let agreement: Agreement | null = null;
  if (expert != null && customer != null) {
    const gap = expert - customer;
    const g = Math.abs(gap);
    if (g >= s.disagreement_gap) {
      agreement = { kind: 'disagree', label: 'Disagree', note: `${gap > 0 ? 'Experts' : 'Customers'} rate it ${fmt1(g)} higher.` };
    } else if (g >= s.disagreement_gap / 2) {
      agreement = { kind: 'mostly', label: 'Mostly agree', note: `${gap > 0 ? 'Experts' : 'Customers'} rate it a little higher.` };
    } else {
      agreement = { kind: 'agree', label: 'Agree', note: `Within ${fmt1(g)} points.` };
    }
  }

  const criteria = {} as Record<CriterionKey, number | null>;
  for (const c of CRITERIA) criteria[c.key] = median(ballots.map((b) => b[c.key]));

  return {
    expert,
    customer,
    expertWeight: w,
    total,
    ballotCount: scores.length,
    reviewCount: p.review_count,
    provisional: scores.length < s.min_ballots,
    agreement,
    criteria,
  };
}

/** Sort for a ranking: scored & non-provisional first (by score), then provisional, then unscored. */
export function rank<T extends { name: string }>(rows: { item: T; score: ScoreResult }[]) {
  const sorted = [...rows].sort((a, b) => {
    const at = a.score.total, bt = b.score.total;
    if (at == null && bt == null) return a.item.name.localeCompare(b.item.name);
    if (at == null) return 1;
    if (bt == null) return -1;
    if (a.score.provisional !== b.score.provisional) return a.score.provisional ? 1 : -1;
    return bt - at;
  });
  let n = 0;
  return sorted.map((r) => ({ ...r, position: r.score.total != null && !r.score.provisional ? ++n : null }));
}
