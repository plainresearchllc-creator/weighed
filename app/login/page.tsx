'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${site}/auth/callback?next=/panel` } });
    setState(error ? 'error' : 'sent');
  }

  return (
    <main className="wrap">
      <div className="login panel">
        <h1 style={{ fontSize: 36 }}>Sign in</h1>
        <p className="small">For panelists and editors. We’ll email you a one-time sign-in link, so there’s no password to remember.</p>
        {state === 'sent' ? (
          <p className="msg ok" role="status">Check {email} for your sign-in link.</p>
        ) : (
          <form onSubmit={onSubmit} className="stack" style={{ marginTop: 16 }}>
            <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} autoComplete="email" /></div>
            <button className="btn primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>
            {state === 'error' && <p className="msg err" role="status">The link couldn’t be sent. Check the address and try again.</p>}
          </form>
        )}
      </div>
    </main>
  );
}
