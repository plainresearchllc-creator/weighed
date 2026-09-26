import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Flash from '@/components/Flash';
import WeightsForm from '@/components/admin/WeightsForm';
import { CATEGORIES } from '@/lib/categories';
import { getBallots, getPress, getProducts, getSettings, getViewer } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import { addPress, addProduct, clearSamples, deletePress, saveSettings, setRole } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false } };

export default async function AdminPage({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (viewer.profile?.role !== 'admin') redirect('/');

  const supabase = createClient();
  const [settings, products, ballots, press, people] = await Promise.all([
    getSettings(),
    getProducts(),
    getBallots(),
    getPress(),
    supabase.from('profiles').select('id, full_name, credential, role_title, role, verified_at').order('created_at').then((r: { data: unknown }) => ((r.data as unknown[] | null) ?? []) as (Profile & { verified_at: string | null })[]),
  ]);
  const items = products.map((p) => ({
    id: p.id, name: p.name, category: p.category, review_count: p.review_count, avg_rating: p.avg_rating,
    ballots: ballots.filter((b) => b.product_id === p.id).map(({ evidence, dosing, transparency, safety, value }) => ({ evidence, dosing, transparency, safety, value })),
  }));
  const samples = products.filter((p) => p.is_sample).length;
  const subs = await supabase.from('subscribers').select('email, source, created_at, product_id').order('created_at', { ascending: false }).limit(25)
    .then((r: { data: unknown }) => (r.data as { email: string; source: string; created_at: string; product_id: string | null }[] | null) ?? []);
  const { count: subCount } = await supabase.from('subscribers').select('id', { count: 'exact', head: true });

  return (
    <main className="wrap">
      <div className="eyebrow">Admin</div>
      <h1>Manage the rankings</h1>
      <p className="lede">Changes here update the live site. Anything that can move a score is recorded in the public corrections log.</p>
      <Flash ok={searchParams.ok} err={searchParams.err} />

      <div className="admin" style={{ marginTop: 28 }}>
        <WeightsForm saved={settings} items={items} action={saveSettings} />

        <div className="stack">
          <div className="panel">
            <h3>Add a product</h3>
            <form className="grid" action={addProduct} style={{ marginTop: 14 }}>
              <div className="field"><label htmlFor="p-name">Product name</label><input id="p-name" name="name" required /></div>
              <div className="field"><label htmlFor="p-brand">Brand</label><input id="p-brand" name="brand" required /></div>
              <div className="field full"><label htmlFor="p-cat">Category</label>
                <select id="p-cat" name="category">{CATEGORIES.map((c) => <option key={c.slug}>{c.name}</option>)}</select>
              </div>
              <div className="field full"><label htmlFor="p-tags">Tags</label><input id="p-tags" name="tags" placeholder="Stimulant-free, Fully disclosed label" /><span className="hint">Separate with commas</span></div>
              <div className="field full"><label htmlFor="p-sum">Summary</label><textarea id="p-sum" name="summary" /></div>
              <div className="field full"><label htmlFor="p-img">Product photo (optional)</label><input id="p-img" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /><span className="hint">PNG, JPG, WebP or GIF, up to 8 MB</span></div>
              <div className="field"><label htmlFor="p-ret">Retailer (optional)</label><input id="p-ret" name="retailer" placeholder="e.g. Amazon" /></div>
              <div className="field"><label htmlFor="p-buy">Product link (optional)</label><input id="p-buy" name="buy_url" type="url" placeholder="https://" /></div>
              <div className="field"><label htmlFor="p-n">Verified reviews</label><input id="p-n" name="review_count" type="number" min={0} step={1} defaultValue={0} /></div>
              <div className="field"><label htmlFor="p-avg">Average stars (1–5)</label><input id="p-avg" name="avg_rating" type="number" min={1} max={5} step={0.01} /></div>
              <div className="actions full"><button className="btn primary" type="submit">Add product</button></div>
            </form>
          </div>

          <div className="panel">
            <h3>Press coverage</h3>
            <p className="small" style={{ margin: '0 0 14px' }}>Appears as “Covered by” under the stats bar. List only stories the outlet’s own journalists wrote. Republished press releases don’t count.</p>
            <form className="grid" action={addPress}>
              <div className="field"><label htmlFor="pr-outlet">Outlet name</label><input id="pr-outlet" name="outlet" required /></div>
              <div className="field"><label htmlFor="pr-date">Published</label><input id="pr-date" name="published_on" type="date" required /></div>
              <div className="field full"><label htmlFor="pr-head">Headline</label><input id="pr-head" name="headline" required /></div>
              <div className="field full"><label htmlFor="pr-url">Link to the article</label><input id="pr-url" name="url" type="url" placeholder="https://" required /></div>
              <label className="check full"><input type="checkbox" name="editorial" required /> This is original reporting by the outlet, not a paid placement or a syndicated press release.</label>
              <div className="actions full"><button className="btn primary" type="submit">Add coverage</button></div>
            </form>
            {press.length > 0 && (
              <div className="presslist">
                {press.map((x) => (
                  <div className="row" key={x.id}>
                    <span><b>{x.outlet}</b> · {x.headline}</span>
                    <form action={deletePress}><input type="hidden" name="id" value={x.id} /><button className="btn ghost" type="submit">Remove</button></form>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h3>People</h3>
            <p className="small" style={{ margin: '0 0 14px' }}>Everyone who has signed in. Make verified experts panelists so they can submit ballots from the Panel page.</p>
            <div className="presslist">
              {people.map((u: Profile & { verified_at: string | null }) => (
                <form className="row" action={setRole} key={u.id}>
                  <input type="hidden" name="id" value={u.id} />
                  <span>
                    <b>{u.full_name || 'Unnamed'}</b>{u.credential ? `, ${u.credential}` : ''}
                    <span className="small"> · {u.verified_at ? 'license verified' : 'not verified'}</span>
                  </span>
                  <span className="actions">
                    <label className="visually-hidden" htmlFor={`role-${u.id}`}>Role</label>
                    <select id={`role-${u.id}`} name="role" defaultValue={u.role}>
                      <option value="viewer">Viewer</option>
                      <option value="panelist">Panelist</option>
                      <option value="admin">Admin</option>
                    </select>
                    {!u.verified_at && <label className="check"><input type="checkbox" name="verified" /> Verified</label>}
                    <button className="btn" type="submit">Save</button>
                  </span>
                </form>
              ))}
            </div>
          </div>

          <div className="panel">
            <h3>Email sign-ups</h3>
            <p className="small" style={{ margin: '0 0 12px' }}>{subCount ?? 0} total. Newest first. Score alerts are tied to a product.</p>
            {subs.length === 0 ? <p className="small">No sign-ups yet.</p> : (
              <div className="tablewrap"><table>
                <thead><tr><th>Email</th><th>Type</th><th>Product</th><th>Date</th></tr></thead>
                <tbody>{subs.map((s, i) => (
                  <tr key={i}><td>{s.email}</td><td>{s.source === 'score-alert' ? 'Score alert' : 'Newsletter'}</td><td>{products.find((p) => p.id === s.product_id)?.name ?? '–'}</td><td>{new Date(s.created_at).toLocaleDateString('en-US')}</td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>

          {samples > 0 && (
            <div className="panel">
              <h3>Sample data</h3>
              <p className="small">{samples} sample products are loaded so the site has something to show. Remove them before publishing real rankings. Type REMOVE to confirm.</p>
              <form action={clearSamples} className="actions">
                <div className="field"><label htmlFor="rm">Confirm</label><input id="rm" name="confirm" placeholder="REMOVE" autoComplete="off" /></div>
                <button className="btn danger" type="submit">Remove sample data</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
