import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS, scoreProduct, rank, type ScoringSettings } from '@/lib/scoring';
import type { Ballot, LogEntry, Press, Product, Profile } from '@/lib/types';

export function imageUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export async function getViewer(): Promise<{ id: string; email: string | null; profile: Profile | null } | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from('profiles').select('id, full_name, credential, role_title, role').eq('id', data.user.id).maybeSingle();
  return { id: data.user.id, email: data.user.email ?? null, profile: (profile as Profile | null) ?? null };
}

export async function getSettings(): Promise<ScoringSettings> {
  const supabase = createClient();
  const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    base_expert_weight: Number(data.base_expert_weight),
    max_expert_weight: Number(data.max_expert_weight),
    full_weight_reviews: Number(data.full_weight_reviews),
    min_weight_reviews: Number(data.min_weight_reviews),
    disagreement_gap: Number(data.disagreement_gap),
    min_ballots: Number(data.min_ballots),
  };
}

function normalizeProduct(p: Record<string, unknown>): Product {
  return {
    ...(p as unknown as Product),
    review_count: Number(p.review_count ?? 0),
    avg_rating: p.avg_rating == null ? null : Number(p.avg_rating),
    filtered_count: Number(p.filtered_count ?? 0),
    tags: (p.tags as string[] | null) ?? [],
  };
}

function normalizeBallot(b: Record<string, unknown>): Ballot {
  return {
    ...(b as unknown as Ballot),
    evidence: Number(b.evidence),
    dosing: Number(b.dosing),
    transparency: Number(b.transparency),
    safety: Number(b.safety),
    value: Number(b.value),
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  const supabase = createClient();
  let q = supabase.from('products').select('*').order('name');
  if (category) q = q.eq('category', category);
  const { data } = await q;
  return (data ?? []).map(normalizeProduct);
}

export async function getBallots(productIds?: string[]): Promise<Ballot[]> {
  const supabase = createClient();
  let q = supabase.from('ballots').select('*').order('created_at');
  if (productIds) {
    if (!productIds.length) return [];
    q = q.in('product_id', productIds);
  }
  const { data } = await q;
  return (data ?? []).map(normalizeBallot);
}

export async function getRanking(category: string, settings?: ScoringSettings) {
  const s = settings ?? (await getSettings());
  const products = await getProducts(category);
  const ballots = await getBallots(products.map((p) => p.id));
  const byProduct = new Map<string, Ballot[]>();
  for (const b of ballots) byProduct.set(b.product_id, [...(byProduct.get(b.product_id) ?? []), b]);
  const rows = products.map((p) => ({ item: p, ballots: byProduct.get(p.id) ?? [], score: scoreProduct(p, byProduct.get(p.id) ?? [], s) }));
  const ranked = rank(rows).map((r) => ({ ...r, ballots: byProduct.get(r.item.id) ?? [] }));
  return { settings: s, rows: ranked, ballots };
}

export async function getProduct(id: string) {
  const supabase = createClient();
  const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const product = normalizeProduct(data);
  const ballots = await getBallots([id]);
  const settings = await getSettings();
  return { product, ballots, settings, score: scoreProduct(product, ballots, settings) };
}

export async function getPress(): Promise<Press[]> {
  const supabase = createClient();
  const { data } = await supabase.from('press').select('id, outlet, headline, url, published_on').order('published_on', { ascending: false });
  return (data ?? []) as Press[];
}

export async function getLog(limit = 200): Promise<LogEntry[]> {
  const supabase = createClient();
  const { data } = await supabase.from('score_log').select('*').order('changed_at', { ascending: false }).limit(limit);
  return (data ?? []) as LogEntry[];
}

export async function getConflicts(expertId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from('conflicts').select('brand').eq('expert_id', expertId);
  return (data ?? []).map((r: { brand: string }) => r.brand);
}
