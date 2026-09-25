import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Flash from '@/components/Flash';
import { getBallots, getConflicts, getProducts, getViewer } from '@/lib/data';
import { CRITERIA, ballotScore, fmt1 } from '@/lib/scoring';
import { createClient } from '@/lib/supabase/server';
import { addConflict, saveProfile, submitBallot } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Panelist portal', robots: { index: false } };

export default async function PanelPage({ searchParams }: { searchParams: { ok?: string; err?: string; p?: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const me = viewer.profile;
  const canVote = me?.role === 'panelist' || me?.role === 'admin';

  const supabase = createClient();
  const [products, ballots, conflicts, priv] = await Promise.all([
    getProducts(),
    getBallots(),
    canVote ? getConflicts(viewer.id) : Promise.resolve([] as string[]),
    supabase.from('expert_private').select('license_number, issuing_board').eq('id', viewer.id).maybeSingle().then((r: { data: { license_number: string | null; issuing_board: string | null } | null }) => r.data),
  ]);
  const mine = ballots.filter((b) => b.expert_id === viewer.id);
  const votedOn = new Set(mine.map((b) => b.product_id));
  const blocked = new Set(conflicts.map((c) => c.toLowerCase()));
  const todo = products.filter((p) => !p.is_sample && !votedOn.has(p.id) && !blocked.has(p.brand.toLowerCase()));
  const selected = todo.find((p) => p.id === searchParams.p) ?? null;

  return (
    <main className="wrap">
      <div className="eyebrow">Panelist portal</div>
      <h1>{me?.full_name ? `Welcome, ${me.full_name}` : 'Your panel profile'}</h1>
      <p className="lede">Score products independently. Your ballots are published with your name, credential and reasoning.</p>
      <Flash ok={searchParams.ok} err={searchParams.err} />

      <div className="admin" style={{ marginTop: 28 }}>
        <div className="stack">
          {!canVote && (
            <div className="banner">Your account isn’t on a panel yet. Complete your profile, and an admin will verify your license and add you.</div>
          )}
          {canVote && (
            <div className="panel">
              <h3>Products awaiting your ballot</h3>
              {todo.length === 0 ? <p className="small">You’re all caught up.</p> : (
                <div className="presslist">
                  {todo.map((p) => (
                    <div className="row" key={p.id}>
                      <span><b>{p.name}</b> · {p.brand} <span className="small">· {p.category}</span></span>
                      <Link className="btn" href={`/panel?p=${p.id}#ballot`}>Score it</Link>
                    </div>
                  ))}
                </div>
              )}
              {conflicts.length > 0 && <p className="small" style={{ marginTop: 14 }}>Hidden because of your declared ties: {conflicts.join(', ')}.</p>}
            </div>
          )}

          {canVote && selected && (
            <div className="panel" id="ballot">
              <h3>Your ballot: {selected.name}</h3>
              <p className="small" style={{ margin: '0 0 14px' }}>{selected.brand} · Score each criterion from 0 to 10.</p>
              <form className="grid" action={submitBallot}>
                <input type="hidden" name="product_id" value={selected.id} />
                <div className="field full"><span className="lab">Criteria scores</span>
                  <div className="five">
                    {CRITERIA.map((c) => (
                      <div className="field" key={c.key}><label className="hint" htmlFor={`v-${c.key}`}>{c.label}</label>
                        <input id={`v-${c.key}`} name={c.key} type="number" min={0} max={10} step={0.5} required inputMode="decimal" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field full"><label htmlFor="v-rat">Rationale</label><textarea id="v-rat" name="rationale" required placeholder="One or two sentences. Cite studies where relevant." /></div>
                <label className="check full"><input type="checkbox" name="no_conflicts" required /> I have had no financial ties to {selected.brand} in the past 24 months.</label>
                <div className="actions full"><button className="btn primary" type="submit">Submit ballot</button></div>
              </form>
            </div>
          )}

          {mine.length > 0 && (
            <div className="panel">
              <h3>Your published ballots</h3>
              <div className="presslist">
                {mine.map((b) => {
                  const p = products.find((x) => x.id === b.product_id);
                  return (
                    <div className="row" key={b.id}>
                      <span><Link href={`/p/${b.product_id}`}>{p?.name ?? 'Product'}</Link></span>
                      <b>{fmt1(ballotScore(b))}</b>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="panel">
            <h3>Profile</h3>
            <form className="grid" action={saveProfile} style={{ marginTop: 14 }}>
              <div className="field full"><label htmlFor="f-name">Full name</label><input id="f-name" name="full_name" defaultValue={me?.full_name ?? ''} required /></div>
              <div className="field"><label htmlFor="f-cred">Credential</label><input id="f-cred" name="credential" defaultValue={me?.credential ?? ''} placeholder="RD, MD, PharmD" /></div>
              <div className="field"><label htmlFor="f-role">Role</label><input id="f-role" name="role_title" defaultValue={me?.role_title ?? ''} placeholder="Clinical pharmacist" /></div>
              <div className="field"><label htmlFor="f-lic">License or registration number</label><input id="f-lic" name="license_number" defaultValue={priv?.license_number ?? ''} /></div>
              <div className="field"><label htmlFor="f-board">Issuing board and state</label><input id="f-board" name="issuing_board" defaultValue={priv?.issuing_board ?? ''} /></div>
              <p className="hint full" style={{ margin: 0 }}>Your license number is used only for verification and is never published.</p>
              <div className="actions full"><button className="btn primary" type="submit">Save profile</button></div>
            </form>
          </div>

          {canVote && (
            <div className="panel">
              <h3>Conflict-of-interest disclosures</h3>
              <p className="small" style={{ margin: '0 0 14px' }}>Add every brand you’ve had a financial tie to in the past 24 months. You’ll never be asked to score them. Only an admin can remove a disclosure.</p>
              <form className="grid" action={addConflict}>
                <div className="field"><label htmlFor="c-brand">Brand</label><input id="c-brand" name="brand" required /></div>
                <div className="field"><label htmlFor="c-type">Type of tie</label>
                  <select id="c-type" name="tie_type">
                    {['Employment or consulting', 'Equity or ownership', 'Paid endorsement', 'Affiliate income', 'Research funding', 'Gifts or free product', 'Personal relationship'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="actions full"><button className="btn" type="submit">Add disclosure</button></div>
              </form>
              {conflicts.length > 0 && <p className="small" style={{ marginTop: 12 }}>On file: {conflicts.join(', ')}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
