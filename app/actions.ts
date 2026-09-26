'use server';

import { createClient } from '@/lib/supabase/server';

export type SubscribeResult = { ok: boolean; message: string };

export async function subscribe(fd: FormData): Promise<SubscribeResult> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const productId = String(fd.get('product_id') ?? '') || null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: 'Enter a valid email address.' };
  // Honeypot: real people never fill this hidden field.
  if (String(fd.get('company') ?? '')) return { ok: true, message: 'You’re on the list.' };

  const supabase = createClient();
  const { error } = await supabase.from('subscribers').insert({
    email,
    product_id: productId,
    source: productId ? 'score-alert' : 'newsletter',
  });
  if (error && error.code !== '23505') return { ok: false, message: 'That didn’t go through. Try again in a moment.' };
  return {
    ok: true,
    message: productId ? 'Done. We’ll email you if this score changes.' : 'You’re on the list. Expect one email a month.',
  };
}
