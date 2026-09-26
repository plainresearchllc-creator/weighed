'use client';

import { useState } from 'react';
import { subscribe, type SubscribeResult } from '@/app/actions';

export default function SubscribeForm({ productId, button = 'Sign up', id = 'subscribe-email' }: { productId?: string; button?: string; id?: string }) {
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [result, setResult] = useState<SubscribeResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    const fd = new FormData(e.currentTarget);
    try {
      setResult(await subscribe(fd));
    } catch {
      setResult({ ok: false, message: 'That didn’t go through. Try again in a moment.' });
    }
    setState('idle');
  }

  if (result?.ok) return <p className="msg ok" role="status">{result.message}</p>;

  return (
    <form className="subscribe" onSubmit={onSubmit}>
      {productId && <input type="hidden" name="product_id" value={productId} />}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="visually-hidden" aria-hidden="true" />
      <label className="visually-hidden" htmlFor={id}>Email address</label>
      <input id={id} name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
      <button className="btn primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Signing up…' : button}</button>
      {result && !result.ok && <p className="msg err" role="status" style={{ flexBasis: '100%', margin: 0 }}>{result.message}</p>}
    </form>
  );
}
