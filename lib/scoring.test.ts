import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, scoreProduct, expertWeight, median, customerScore, rank } from './scoring.ts';

const b = (v: number) => ({ evidence: v, dosing: v, transparency: v, safety: v, value: v });

test('median handles odd and even lengths', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});

test('customer score maps 1–5 stars to 0–10', () => {
  assert.equal(customerScore(1, 10), 0);
  assert.equal(customerScore(3, 10), 5);
  assert.equal(customerScore(5, 10), 10);
  assert.equal(customerScore(4, 0), null);
});

test('expert weight slides from max to base between thresholds', () => {
  assert.equal(expertWeight(50, DEFAULT_SETTINGS), 0.8);
  assert.equal(expertWeight(500, DEFAULT_SETTINGS), 0.6);
  assert.ok(Math.abs(expertWeight(300, DEFAULT_SETTINGS) - 0.7) < 1e-9);
});

test('combined score uses 60/40 with plenty of reviews', () => {
  const r = scoreProduct({ id: 'a', review_count: 1000, avg_rating: 4.36 }, [b(9), b(9), b(9)], DEFAULT_SETTINGS);
  assert.ok(Math.abs((r.total ?? 0) - (9 * 0.6 + 8.4 * 0.4)) < 1e-9);
  assert.equal(r.agreement?.kind, 'agree');
  assert.equal(r.provisional, false);
});

test('disagreement flag and provisional state', () => {
  const r = scoreProduct({ id: 'd', review_count: 4000, avg_rating: 4.04 }, [b(5), b(5)], DEFAULT_SETTINGS);
  assert.equal(r.agreement?.kind, 'disagree');
  assert.equal(r.provisional, true);
});

test('no reviews means experts only', () => {
  const r = scoreProduct({ id: 'x', review_count: 0, avg_rating: null }, [b(7), b(8), b(9)], DEFAULT_SETTINGS);
  assert.equal(r.total, 8);
  assert.equal(r.expertWeight, 1);
});

test('ranking puts provisional and unscored products last', () => {
  const s = DEFAULT_SETTINGS;
  const rows = [
    { item: { name: 'P' }, score: scoreProduct({ id: 'p', review_count: 10, avg_rating: 5 }, [b(10)], s) },
    { item: { name: 'U' }, score: scoreProduct({ id: 'u', review_count: 10, avg_rating: 5 }, [], s) },
    { item: { name: 'A' }, score: scoreProduct({ id: 'a', review_count: 900, avg_rating: 3 }, [b(6), b(6), b(6)], s) },
  ];
  const r = rank(rows);
  assert.deepEqual(r.map((x) => x.item.name), ['A', 'P', 'U']);
  assert.deepEqual(r.map((x) => x.position), [1, null, null]);
});
