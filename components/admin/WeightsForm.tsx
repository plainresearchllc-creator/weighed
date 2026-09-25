'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { fmt1, rank, scoreProduct, type BallotScores, type ScoringSettings } from '@/lib/scoring';

type Item = { id: string; name: string; category: string; review_count: number; avg_rating: number | null; ballots: BallotScores[] };

const FIELDS: { key: keyof ScoringSettings; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: 'base_expert_weight', label: 'Expert share with plenty of reviews', min: 0.3, max: 0.9, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'max_expert_weight', label: 'Expert share with few reviews', min: 0.5, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'full_weight_reviews', label: 'Reviews needed for the standard split', min: 100, max: 2000, step: 50, fmt: String },
  { key: 'min_weight_reviews', label: 'Below this many reviews, use the maximum expert share', min: 0, max: 500, step: 10, fmt: String },
  { key: 'disagreement_gap', label: 'Flag disagreement at a gap of', min: 0.5, max: 3, step: 0.1, fmt: (v) => `${v.toFixed(1)} pts` },
  { key: 'min_ballots', label: 'Expert votes needed to be ranked', min: 1, max: 10, step: 1, fmt: String },
];

export default function WeightsForm({ saved, items, action }: { saved: ScoringSettings; items: Item[]; action: (fd: FormData) => void }) {
  const [draft, setDraft] = useState<ScoringSettings>(saved);
  const [cat, setCat] = useState<string>(CATEGORIES[0].name);
  const dirty = FIELDS.some((f) => draft[f.key] !== saved[f.key]);

  const preview = useMemo(() => {
    const inCat = items.filter((i) => i.category === cat);
    const before = rank(inCat.map((i) => ({ item: i, score: scoreProduct(i, i.ballots, saved) })));
    const after = rank(inCat.map((i) => ({ item: i, score: scoreProduct(i, i.ballots, draft) })));
    const pos = new Map(before.map((r) => [r.item.id, r.position]));
    return after.map((r) => ({ ...r, was: pos.get(r.item.id) ?? null }));
  }, [items, cat, draft, saved]);

  function set(key: keyof ScoringSettings, v: number) {
    const next = { ...draft, [key]: v };
    if (next.min_weight_reviews >= next.full_weight_reviews) next.min_weight_reviews = Math.max(0, next.full_weight_reviews - 50);
    if (next.max_expert_weight < next.base_expert_weight) next.max_expert_weight = next.base_expert_weight;
    setDraft(next);
  }

  return (
    <div className="panel">
      <h3>Scoring weights</h3>
      <p className="small" style={{ margin: '0 0 16px' }}>Drag to preview. Nothing changes on the site until you save, and every save is logged publicly.</p>
      <form action={action}>
        <div className="stack">
          {FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`s-${f.key}`}>{f.label}</label>
              <div className="slider">
                <input type="range" id={`s-${f.key}`} name={f.key} min={f.min} max={f.max} step={f.step} value={draft[f.key]} onChange={(e) => set(f.key, parseFloat(e.target.value))} />
                <output htmlFor={`s-${f.key}`}>{f.fmt(draft[f.key])}</output>
              </div>
            </div>
          ))}
        </div>
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn primary" type="submit" disabled={!dirty}>Save for everyone</button>
          <button className="btn ghost" type="button" disabled={!dirty} onClick={() => setDraft(saved)}>Discard changes</button>
        </div>
      </form>

      <div className="actions" style={{ marginTop: 24, justifyContent: 'space-between' }}>
        <h3>Preview</h3>
        <div className="field">
          <label htmlFor="pv-cat" className="hint">Category</label>
          <select id="pv-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.slug}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>#</th><th>Product</th><th className="num">Experts</th><th className="num">Customers</th><th className="num">Weight</th><th className="num">Score</th><th className="num">Move</th></tr></thead>
          <tbody>
            {preview.length === 0 && <tr><td colSpan={7} className="small">No products in this category.</td></tr>}
            {preview.map((r) => {
              const d = r.position && r.was ? r.was - r.position : 0;
              return (
                <tr key={r.item.id}>
                  <td>{r.position ?? '–'}</td>
                  <td>{r.item.name}</td>
                  <td className="num">{fmt1(r.score.expert)}</td>
                  <td className="num">{fmt1(r.score.customer)}</td>
                  <td className="num">{r.score.customer == null ? '–' : `${Math.round(r.score.expertWeight * 100)}%`}</td>
                  <td className="num"><b>{fmt1(r.score.total)}</b></td>
                  <td className="num">{d > 0 ? <span className="up">▲ {d}</span> : d < 0 ? <span className="down">▼ {-d}</span> : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
