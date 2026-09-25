import { fmt1, type ScoreResult } from '@/lib/scoring';

export function Bar({ kind, label, value, right }: { kind: 'e' | 'c'; label: string; value: number | null; right?: string }) {
  const w = value == null ? 0 : Math.max(0, Math.min(100, value * 10));
  return (
    <div>
      <div className="barhead">
        <b className={kind}>{label} {fmt1(value)}</b>
        {right ? <span className="small">{right}</span> : null}
      </div>
      <div className="track"><div className={`fill ${kind}`} style={{ width: `${w}%` }} /></div>
    </div>
  );
}

export function StatusPill({ score, minBallots }: { score: ScoreResult; minBallots: number }) {
  if (score.total == null) return <span className="pill prov">Awaiting expert votes</span>;
  if (score.provisional) return <span className="pill prov">Provisional · {score.ballotCount} of {minBallots} votes</span>;
  if (score.agreement) return <span className={`pill ${score.agreement.kind}`}>{score.agreement.label}</span>;
  return <span className="pill mostly">No verified reviews yet</span>;
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;
