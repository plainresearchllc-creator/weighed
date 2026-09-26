'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';
import { CRITERIA } from '@/lib/scoring';

const IMG_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_IMG = 8 * 1024 * 1024;

function back(path: string, msg: string, kind: 'ok' | 'err' = 'ok'): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}

async function requireAdmin() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (me?.role !== 'admin') redirect('/');
  return supabase;
}

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? '').trim();
}
function num(fd: FormData, k: string, d = 0) {
  const n = parseFloat(String(fd.get(k) ?? ''));
  return Number.isFinite(n) ? n : d;
}

async function uploadImage(supabase: ReturnType<typeof createClient>, file: File | null, returnTo: string) {
  if (!file || file.size === 0) return null;
  const ext = IMG_TYPES[file.type];
  if (!ext) back(returnTo, 'Use a PNG, JPG, WebP or GIF image.', 'err');
  if (file.size > MAX_IMG) back(returnTo, 'That image is over 8 MB. Use a smaller file.', 'err');
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
  if (error) back(returnTo, 'The photo didn’t upload. Try again.', 'err');
  return path;
}

function refreshAll() {
  revalidatePath('/', 'layout');
}

// ---------------- Products ----------------
export async function addProduct(fd: FormData) {
  const supabase = await requireAdmin();
  const category = str(fd, 'category');
  if (!CATEGORIES.some((c) => c.name === category)) back('/admin', 'Pick a category.', 'err');
  const image_path = await uploadImage(supabase, fd.get('image') as File | null, '/admin');
  const avg = str(fd, 'avg_rating');
  const { data, error } = await supabase.from('products').insert({
    name: str(fd, 'name'),
    brand: str(fd, 'brand'),
    category,
    summary: str(fd, 'summary') || null,
    tags: str(fd, 'tags').split(',').map((t) => t.trim()).filter(Boolean),
    review_count: Math.max(0, Math.round(num(fd, 'review_count'))),
    avg_rating: avg ? Math.min(5, Math.max(1, parseFloat(avg))) : null,
    image_path,
    retailer: str(fd, 'retailer') || null,
    buy_url: /^https?:\/\//i.test(str(fd, 'buy_url')) ? str(fd, 'buy_url') : null,
  }).select('id').single();
  if (error || !data) back('/admin', 'Couldn’t add the product. Check the fields and try again.', 'err');
  refreshAll();
  redirect(`/p/${data.id}?ok=${encodeURIComponent('Product added. Add expert ballots below.')}`);
}

export async function updateCustomer(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, 'id');
  const avg = str(fd, 'avg_rating');
  const { error } = await supabase.from('products').update({
    review_count: Math.max(0, Math.round(num(fd, 'review_count'))),
    avg_rating: avg ? Math.min(5, Math.max(1, parseFloat(avg))) : null,
    filtered_count: Math.max(0, Math.round(num(fd, 'filtered_count'))),
  }).eq('id', id);
  refreshAll();
  back(`/p/${id}`, error ? 'Couldn’t update customer data.' : 'Customer data updated.', error ? 'err' : 'ok');
}

export async function setBuyLink(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, 'id');
  const url = str(fd, 'buy_url');
  if (url && !/^https?:\/\//i.test(url)) back(`/p/${id}`, 'Enter a full link starting with https://', 'err');
  const { error } = await supabase.from('products').update({ retailer: str(fd, 'retailer') || null, buy_url: url || null }).eq('id', id);
  refreshAll();
  back(`/p/${id}`, error ? 'Couldn’t save the link.' : url ? 'Link saved.' : 'Link removed.', error ? 'err' : 'ok');
}

export async function setPhoto(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, 'id');
  const path = await uploadImage(supabase, fd.get('image') as File | null, `/p/${id}`);
  if (!path) back(`/p/${id}`, 'Choose an image first.', 'err');
  const { data: old } = await supabase.from('products').select('image_path').eq('id', id).maybeSingle();
  await supabase.from('products').update({ image_path: path }).eq('id', id);
  if (old?.image_path) await supabase.storage.from('product-images').remove([old.image_path]);
  refreshAll();
  back(`/p/${id}`, 'Photo saved.');
}

export async function removePhoto(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, 'id');
  const { data: old } = await supabase.from('products').select('image_path').eq('id', id).maybeSingle();
  await supabase.from('products').update({ image_path: null }).eq('id', id);
  if (old?.image_path) await supabase.storage.from('product-images').remove([old.image_path]);
  refreshAll();
  back(`/p/${id}`, 'Photo removed.');
}

export async function deleteProduct(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, 'id');
  if (str(fd, 'confirm') !== 'DELETE') back(`/p/${id}`, 'Type DELETE to confirm.', 'err');
  const { data: old } = await supabase.from('products').select('image_path').eq('id', id).maybeSingle();
  await supabase.from('products').delete().eq('id', id);
  if (old?.image_path) await supabase.storage.from('product-images').remove([old.image_path]);
  refreshAll();
  back('/admin', 'Product deleted.');
}

// ---------------- Ballots ----------------
export async function addBallotAsAdmin(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, 'product_id');
  if (fd.get('no_conflicts') !== 'on') back(`/p/${id}`, 'Confirm the expert has no ties to this brand.', 'err');
  const row: Record<string, unknown> = {
    product_id: id,
    expert_name: str(fd, 'expert_name'),
    credential: str(fd, 'credential') || null,
    role_title: str(fd, 'role_title') || null,
    rationale: str(fd, 'rationale') || null,
    no_conflicts: true,
  };
  for (const c of CRITERIA) row[c.key] = Math.min(10, Math.max(0, num(fd, c.key)));
  const { error } = await supabase.from('ballots').insert(row);
  refreshAll();
  back(`/p/${id}`, error ? 'Couldn’t add the ballot.' : 'Ballot added. The score has been recalculated.', error ? 'err' : 'ok');
}

export async function deleteBallot(fd: FormData) {
  const supabase = await requireAdmin();
  const pid = str(fd, 'product_id');
  await supabase.from('ballots').delete().eq('id', str(fd, 'id'));
  refreshAll();
  back(`/p/${pid}`, 'Ballot withdrawn and logged in Corrections.');
}

// ---------------- Settings ----------------
export async function saveSettings(fd: FormData) {
  const supabase = await requireAdmin();
  const base = Math.min(0.95, Math.max(0.05, num(fd, 'base_expert_weight', 0.6)));
  const max = Math.min(1, Math.max(base, num(fd, 'max_expert_weight', 0.8)));
  const full = Math.max(1, Math.round(num(fd, 'full_weight_reviews', 500)));
  const min = Math.min(full - 1, Math.max(0, Math.round(num(fd, 'min_weight_reviews', 100))));
  const { error } = await supabase.from('settings').update({
    base_expert_weight: base,
    max_expert_weight: max,
    full_weight_reviews: full,
    min_weight_reviews: min,
    disagreement_gap: Math.max(0.1, num(fd, 'disagreement_gap', 1.5)),
    min_ballots: Math.max(1, Math.round(num(fd, 'min_ballots', 3))),
  }).eq('id', 1);
  refreshAll();
  back('/admin', error ? 'Couldn’t save the weights.' : 'Saved. Rankings now use these weights, and the change is logged.', error ? 'err' : 'ok');
}

// ---------------- Press ----------------
export async function addPress(fd: FormData) {
  const supabase = await requireAdmin();
  if (fd.get('editorial') !== 'on') back('/admin', 'Only original reporting can be listed.', 'err');
  const url = str(fd, 'url');
  if (!/^https?:\/\//i.test(url)) back('/admin', 'Enter a full link starting with https://', 'err');
  const { error } = await supabase.from('press').insert({ outlet: str(fd, 'outlet'), headline: str(fd, 'headline'), url, published_on: str(fd, 'published_on') });
  refreshAll();
  back('/admin', error ? 'Couldn’t add coverage.' : 'Coverage added.', error ? 'err' : 'ok');
}

export async function deletePress(fd: FormData) {
  const supabase = await requireAdmin();
  await supabase.from('press').delete().eq('id', str(fd, 'id'));
  refreshAll();
  back('/admin', 'Coverage removed.');
}

// ---------------- People ----------------
export async function setRole(fd: FormData) {
  const supabase = await requireAdmin();
  const role = str(fd, 'role');
  if (!['viewer', 'panelist', 'admin'].includes(role)) back('/admin', 'Unknown role.', 'err');
  const update: Record<string, unknown> = { role };
  if (fd.get('verified') === 'on') update.verified_at = new Date().toISOString();
  const { error } = await supabase.from('profiles').update(update).eq('id', str(fd, 'id'));
  refreshAll();
  back('/admin', error ? 'Couldn’t update that person.' : 'Updated.', error ? 'err' : 'ok');
}

// ---------------- Samples ----------------
export async function clearSamples(fd: FormData) {
  const supabase = await requireAdmin();
  if (str(fd, 'confirm') !== 'REMOVE') back('/admin', 'Type REMOVE to confirm.', 'err');
  await supabase.from('products').delete().eq('is_sample', true);
  refreshAll();
  back('/admin', 'Sample data removed.');
}
