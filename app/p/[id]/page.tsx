import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PhotoIcon from '@/components/PhotoIcon';
import { Tags } from '@/components/RankingView';
import { Bar, StatusPill, pct } from '@/components/Score';
import Flash from '@/components/Flash';
import { slugFor } from '@/lib/categories';
import { getProduct, getViewer, imageUrl } from '@/lib/data';
import { CRITERIA, ballotScore, fmt1 } from '@/lib/scoring';
import { addBallotAsAdmin, deleteBallot, deleteProduct, removePhoto, setPhoto, updateCustomer } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string }; searchParams: { ok?: string; err?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await getProduct(params.id);
  return { title: d ? `${d.product.name} review: expert score ${fmt1(d.score.total)}` : 'Product' };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [d, viewer] = await Promise.all([getProduct(params.id), getViewer()]);
  if (!d) notFound();
  const { product: p, ballots, settings: st, score: r } = d;
  const isAdmin = viewer?.profile?.role === 'admin';
  const img = imageUrl(p.image_path);
  const sorted = [...ballots].sort((a, b) => ballotScore(b) - ballotScore(a));

  return (
    <main className="wrap">
      <Link className="back" href={`/c/${slugFor(p.category)}`}>← {p.category} rankings</Link>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="detail">
        <div>
          <div className={`hero-img${img ? '' : ' none'}`}>
            {img ? <img src={img} alt={`${p.name} product photo`} /> : <><PhotoIcon /><span>No product photo yet</span></>}
          </div>
          {isAdmin && (
            <div className="photo-actions">
              <form action={setPhoto} className="actions">
                <input type="hidden" name="id" value={p.id} />
                <label className="field" htmlFor="photo"><span className="lab">{img ? 'Replace photo' : 'Upload photo'}</span>
                  <input id="photo" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
                </label>
                <button className="btn" type="submit">Save photo</button>
              </form>
              {img && (
                <form action={removePhoto}><input type="hidden" name="id" value={p.id} /><button className="btn ghost" type="submit">Remove photo</button></form>
              )}
            </div>
          )}
          <div className="small">{p.brand}</div>
          <h1>{p.name}</h1>
          <Tags tags={p.tags} sample={p.is_sample} />
          {p.summary && <p className="lede">{p.summary}</p>}

          <div className="panel" style={{ marginTop: 24 }}>
            <h3>What the experts scored</h3>
            <p className="small" style={{ margin: 0 }}>Median of {r.ballotCount} independent ballot{r.ballotCount === 1 ? '' : 's'}, each scored 0–10.</p>
            <div className="crit">
              {CRITERIA.map((c) => <Bar key={c.key} kind="e" label={c.label} value={r.criteria[c.key]} />)}
            </div>
          </div>

          <div className="panel">
            <h3>Expert ballots</h3>
            {sorted.length === 0 ? <p className="small">No ballots yet.</p> : (
              <div className="ballots">
                {sorted.map((b) => (
                  <div className="ballot" key={b.id}>
                    <div className="who">
                      <div>
                        <div style={{ fontWeight: 600 }}>{b.expert_name}{b.credential ? `, ${b.credential}` : ''}</div>
                        <div className="small">{b.role_title}</div>
                      </div>
                      <div className="s">{fmt1(ballotScore(b))}</div>
                    </div>
                    <div className="mini">
                      {CRITERIA.map((c) => <div key={c.key}><b>{fmt1(b[c.key])}</b>{c.short}</div>)}
                    </div>
                    {b.rationale && <p>“{b.rationale}”</p>}
                    <div className="small">✓ No ties to this brand declared</div>
                    {isAdmin && (
                      <form action={deleteBallot}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="product_id" value={p.id} />
                        <button className="btn ghost" type="submit">Withdraw ballot</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="panel">
              <h3>Add an expert ballot</h3>
              <p className="small" style={{ margin: '0 0 14px' }}>For ballots collected outside the panelist portal. Score each criterion from 0 to 10.</p>
              <form className="grid" action={addBallotAsAdmin}>
                <input type="hidden" name="product_id" value={p.id} />
                <div className="field"><label htmlFor="b-name">Expert name</label><input id="b-name" name="expert_name" required /></div>
                <div className="field"><label htmlFor="b-cred">Credential</label>
                  <select id="b-cred" name="credential">{['RD', 'MD', 'DO', 'PharmD', 'PhD', 'CSSD', 'Other'].map((c) => <option key={c}>{c}</option>)}</select>
                </div>
                <div className="field full"><label htmlFor="b-role">Role</label><input id="b-role" name="role_title" placeholder="e.g. Clinical pharmacist" /></div>
                <div className="field full"><span className="lab">Criteria scores</span>
                  <div className="five">
                    {CRITERIA.map((c) => (
                      <div className="field" key={c.key}><label className="hint" htmlFor={`b-${c.key}`}>{c.label}</label>
                        <input id={`b-${c.key}`} name={c.key} type="number" min={0} max={10} step={0.5} required inputMode="decimal" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field full"><label htmlFor="b-rat">Rationale</label><textarea id="b-rat" name="rationale" /></div>
                <label className="check full"><input type="checkbox" name="no_conflicts" required /> The expert has declared no financial ties to {p.brand} in the past 24 months.</label>
                <div className="actions full"><button className="btn primary" type="submit">Add ballot</button></div>
              </form>
            </div>
          )}
        </div>

        <aside>
          <div className="panel">
            <div className="eyebrow">Weighed score</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 72, lineHeight: 1, marginTop: 8 }}>{fmt1(r.total)}</div>
            <div style={{ marginTop: 10 }}><StatusPill score={r} minBallots={st.min_ballots} /></div>
            <div className="duo">
              <div className="e"><div className="lbl">Experts</div><div className="v">{fmt1(r.expert)}</div><div className="small">{r.customer == null ? '100%' : pct(r.expertWeight)} weight · {r.ballotCount} votes</div></div>
              <div className="c"><div className="lbl">Customers</div><div className="v">{fmt1(r.customer)}</div><div className="small">{r.customer == null ? '0%' : pct(1 - r.expertWeight)} weight · {r.reviewCount.toLocaleString('en-US')} reviews</div></div>
            </div>
            {r.total != null && r.customer != null && (
              <div className="formula">({fmt1(r.expert)} × {r.expertWeight.toFixed(2)}) + ({fmt1(r.customer)} × {(1 - r.expertWeight).toFixed(2)}) = <b>{fmt1(r.total)}</b></div>
            )}
            {r.agreement && <p className="small" style={{ margin: '8px 0 0' }}>{r.agreement.note}</p>}
          </div>

          <div className="panel">
            <h3>Verified buyers</h3>
            <p className="small" style={{ margin: 0 }}>
              Average {p.avg_rating != null ? p.avg_rating.toFixed(2) : '–'} of 5 stars across {p.review_count.toLocaleString('en-US')} confirmed-purchase reviews
              {p.filtered_count ? `; ${p.filtered_count.toLocaleString('en-US')} suspected fakes removed` : ''}.
            </p>
            {isAdmin && (
              <form className="grid" action={updateCustomer} style={{ marginTop: 16 }}>
                <input type="hidden" name="id" value={p.id} />
                <div className="field"><label htmlFor="c-n">Verified reviews</label><input id="c-n" name="review_count" type="number" min={0} step={1} defaultValue={p.review_count} /></div>
                <div className="field"><label htmlFor="c-avg">Average stars (1–5)</label><input id="c-avg" name="avg_rating" type="number" min={1} max={5} step={0.01} defaultValue={p.avg_rating ?? ''} /></div>
                <div className="field full"><label htmlFor="c-f">Removed as suspected fakes</label><input id="c-f" name="filtered_count" type="number" min={0} step={1} defaultValue={p.filtered_count} /></div>
                <div className="actions full"><button className="btn" type="submit">Update customer data</button></div>
              </form>
            )}
          </div>

          {isAdmin && (
            <div className="panel">
              <h3>Remove product</h3>
              <p className="small">Deletes the product and its {ballots.length} ballots for everyone. Type DELETE to confirm.</p>
              <form action={deleteProduct} className="actions">
                <input type="hidden" name="id" value={p.id} />
                <div className="field"><label htmlFor="del">Confirm</label><input id="del" name="confirm" placeholder="DELETE" autoComplete="off" /></div>
                <button className="btn danger" type="submit">Delete product</button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
