'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CRITERIA } from '@/lib/scoring';

function back(msg: string, kind: 'ok' | 'err' = 'ok'): never {
  redirect(`/panel?${kind}=${encodeURIComponent(msg)}`);
}

async function requirePanelist() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('id, full_name, credential, role_title, role').eq('id', data.user.id).maybeSingle();
  if (!me || (me.role !== 'panelist' && me.role !== 'admin')) redirect('/');
  return { supabase, me };
}

export async function saveProfile(fd: FormData) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const { error } = await supabase.from('profiles').update({
    full_name: String(fd.get('full_name') ?? '').trim() || null,
    credential: String(fd.get('credential') ?? '').trim() || null,
    role_title: String(fd.get('role_title') ?? '').trim() || null,
  }).eq('id', data.user.id);
  const license = String(fd.get('license_number') ?? '').trim();
  const board = String(fd.get('issuing_board') ?? '').trim();
  if (license || board) {
    await supabase.from('expert_private').upsert({ id: data.user.id, license_number: license || null, issuing_board: board || null, updated_at: new Date().toISOString() });
  }
  back(error ? 'Couldn’t save your profile.' : 'Profile saved.', error ? 'err' : 'ok');
}

export async function addConflict(fd: FormData) {
  const { supabase, me } = await requirePanelist();
  const brand = String(fd.get('brand') ?? '').trim();
  if (!brand) back('Enter a brand name.', 'err');
  const { error } = await supabase.from('conflicts').insert({ expert_id: me.id, brand, tie_type: String(fd.get('tie_type') ?? '') || null });
  revalidatePath('/panel');
  back(error ? 'That brand is already on your list.' : `${brand} added. You won’t be asked to score its products.`, error ? 'err' : 'ok');
}

export async function submitBallot(fd: FormData) {
  const { supabase, me } = await requirePanelist();
  if (!me.full_name) back('Add your name and credential to your profile before voting.', 'err');
  if (fd.get('no_conflicts') !== 'on') back('Confirm you have no ties to this brand.', 'err');
  const row: Record<string, unknown> = {
    product_id: String(fd.get('product_id')),
    expert_id: me.id,
    expert_name: me.full_name,
    credential: me.credential,
    role_title: me.role_title,
    rationale: String(fd.get('rationale') ?? '').trim() || null,
    no_conflicts: true,
  };
  for (const c of CRITERIA) {
    const n = parseFloat(String(fd.get(c.key) ?? ''));
    if (!Number.isFinite(n) || n < 0 || n > 10) back('Score every criterion from 0 to 10.', 'err');
    row[c.key] = n;
  }
  const { error } = await supabase.from('ballots').insert(row);
  revalidatePath('/', 'layout');
  back(error ? 'Your ballot wasn’t accepted. You may have already voted on this product, or have a declared tie to its brand.' : 'Ballot submitted and published.', error ? 'err' : 'ok');
}
