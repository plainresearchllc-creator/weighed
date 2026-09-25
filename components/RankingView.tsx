import Link from 'next/link';
import { notFound } from 'next/navigation';
import CategoryBar from '@/components/CategoryBar';
import PhotoIcon from '@/components/PhotoIcon';
import { Bar, StatusPill, pct } from '@/components/Score';
import { categoryBySlug } from '@/lib/categories';
import { getPress, getProducts, getRanking, imageUrl } from '@/lib/data';
import { fmt1 } from '@/lib/scoring';

const PLEDGES = [
  { icon: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>, title: 'No paid placement', body: 'Brands can’t buy a rank, a review, or removal from the list.' },
  { icon: <><path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>, title: 'Bought at retail', body: 'We purchase every product ourselves. Brands never choose what panelists receive.' },
  { icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>, title: 'Named, verified experts', body: 'Every ballot is published with the expert’s name, credential and reasoning.' },
  { icon: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></>, title: 'Public corrections', body: 'Every change that can move a score is logged with its date and reason.' },
];

export default async function RankingView({ slug }: { slug: string }) {
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  const [{ settings: st, rows }, all, press] = await Promise.all([getRanking(cat.name), getProducts(), getPress()]);
  const counts: Record<string, number> = {};
  for (const p of all) counts[p.category] = (counts[p.category] ?? 0) + 1;

  let ballotsTotal = 0, reviews = 0, filtered = 0, latest = '';
  const experts = new Map<string, { name: string; cred: string | null; role: string | null; n: number; sample: boolean }>();
  for (const r of rows) {
    ballotsTotal += r.score.ballotCount;
    reviews += r.item.review_count;
    filtered += r.item.filtered_count;
    if (r.item.created_at > latest) latest = r.item.created_at;
    for (const b of r.ballots) {
      if (b.created_at > latest) latest = b.created_at;
      const key = b.expert_id ?? `${b.expert_name}|${b.credential}`;
      const e = experts.get(key) ?? { name: b.expert_name, cred: b.credential, role: b.role_title, n: 0, sample: b.is_sample };
      e.n++;
      experts.set(key, e);
    }
  }
  const panel = [...experts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const disciplines = new Set(panel.map((p) => p.role).filter(Boolean)).size;
  const updated = latest ? new Date(latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '–';

  return (
    <>
      <CategoryBar active={cat.slug} counts={counts} />
      <main className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">{cat.name}</div>
            <h1>Ranked by credentialed experts, weighed against verified buyers</h1>
            <p className="lede">Every product here is scored independently by a vetted panel, then checked against what confirmed buyers report. No brand can pay for a place on this list.</p>
          </div>
          <div className="weightcard">
            <div style={{ fontWeight: 600, fontSize: 14 }}>How the score is weighted</div>
            <div className="split"><div className="e" style={{ width: pct(st.base_expert_weight) }} /><div className="c" style={{ width: pct(1 - st.base_expert_weight) }} /></div>
            <div className="legend"><span><b className="e">{pct(st.base_expert_weight)}</b> Experts</span><span><b className="c">{pct(1 - st.base_expert_weight)}</b> Customers</span></div>
            <p className="small" style={{ margin: '10px 0 0' }}>Under {st.full_weight_reviews} verified reviews, the expert share rises to as much as {pct(st.max_expert_weight)}. <Link href="/method">Full method</Link></p>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="stats" role="list">
            <Stat v={String(panel.length)} label="credentialed experts" sub={`${disciplines} disciplines on this panel`} />
            <Stat v={String(ballotsTotal)} label="independent ballots" sub="scored blind, published by name" />
            <Stat v={reviews.toLocaleString('en-US')} label="verified-purchase reviews" sub={`${filtered.toLocaleString('en-US')} suspected fakes removed`} />
            <Stat v={updated} label="last updated" sub={<Link href="/corrections">See every change</Link>} />
          </div>
        )}

        {press.length > 0 && (
          <div className="press">
            <span className="eyebrow">Covered by</span>
            <div className="outlets">
              {press.slice(0, 6).map((x) => (
                <a key={x.id} className="outlet" href={x.url} target="_blank" rel="noopener noreferrer" title={x.headline}>{x.outlet}</a>
              ))}
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="empty"><h3>No products scored in {cat.name} yet</h3><p>This panel hasn’t reviewed any products.</p></div>
        ) : (
          <div className="list">
            {rows.map(({ item: p, score: r, position }) => {
              const img = imageUrl(p.image_path);
              return (
                <Link key={p.id} href={`/p/${p.id}`} className="pcard" aria-label={`${p.name}, score ${fmt1(r.total)}`}>
                  <div className="rank">{position ?? '–'}</div>
                  <div className="pinfo">
                    <div className="thumb">{img ? <img src={img} alt={`${p.name} product photo`} loading="lazy" /> : <PhotoIcon />}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="small">{p.brand}</div>
                      <div className="pname">{p.name}</div>
                      <Tags tags={p.tags} sample={p.is_sample} />
                    </div>
                  </div>
                  <div className="bars">
                    <Bar kind="e" label="Experts" value={r.expert} right={`${r.ballotCount} vote${r.ballotCount === 1 ? '' : 's'}`} />
                    <Bar kind="c" label="Customers" value={r.customer} right={`${r.reviewCount.toLocaleString('en-US')} verified reviews`} />
                    <div>
                      <StatusPill score={r} minBallots={st.min_ballots} />
                      {r.agreement && !r.provisional ? <span className="note"> {r.agreement.note}</span> : null}
                    </div>
                  </div>
                  <div className="score">
                    <div className="eyebrow">Weighed</div>
                    <div className="big">{fmt1(r.total)}</div>
                    <div className="small">{r.customer == null ? 'Experts only' : `${pct(r.expertWeight)} / ${pct(1 - r.expertWeight)}`}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {panel.length > 0 && (
          <section className="panelsec" aria-labelledby="panel-h">
            <div className="sechead">
              <div><div className="eyebrow">The {cat.name} panel</div><h2 id="panel-h">Who scored these products</h2></div>
              <p className="small" style={{ maxWidth: '44ch', margin: 0 }}>Each panelist’s license is checked with the issuing board, conflicts are disclosed, and any brand they have ties to is removed from their ballot.</p>
            </div>
            <div className="experts">
              {panel.slice(0, 8).map((x) => (
                <div className="expert" key={`${x.name}${x.cred}`}>
                  <div className="av" aria-hidden="true">{initials(x.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="en">{x.name}{x.cred ? `, ${x.cred}` : ''}</div>
                    <div className="small">{x.role}</div>
                    <div className="small">{x.n} ballot{x.n === 1 ? '' : 's'} this category{x.sample ? <> · <span className="samp">sample</span></> : null}</div>
                  </div>
                </div>
              ))}
            </div>
            {panel.length > 8 && <p className="small">And {panel.length - 8} more panelists.</p>}
          </section>
        )}

        <section className="pledge" aria-labelledby="pledge-h">
          <h2 id="pledge-h">Why you can trust these rankings</h2>
          <div className="pledges">
            {PLEDGES.map((p) => (
              <div className="pl" key={p.title}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p.icon}</svg>
                <div><div className="pt">{p.title}</div><div className="pb">{p.body}</div></div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ v, label, sub }: { v: string; label: string; sub: React.ReactNode }) {
  return (
    <div className="stat" role="listitem">
      <div className="sv">{v}</div>
      <div className="sl">{label}</div>
      <div className="small">{sub}</div>
    </div>
  );
}

export function Tags({ tags, sample }: { tags: string[]; sample: boolean }) {
  if (!tags.length && !sample) return null;
  return (
    <div className="tags">
      {tags.map((t) => <span className="tag" key={t}>{t}</span>)}
      {sample && <span className="tag sample">Sample data</span>}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
