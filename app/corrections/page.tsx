import type { Metadata } from 'next';
import Link from 'next/link';
import { getLog } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Corrections log' };

export default async function CorrectionsPage() {
  const log = await getLog();
  return (
    <main className="wrap">
      <div className="eyebrow">Corrections log</div>
      <h1>Every change that can move a score</h1>
      <p className="lede">Recorded automatically by the database, newest first. Entries can’t be edited or removed from the site.</p>
      <div className="panel" style={{ marginTop: 24 }}>
        {log.length === 0 ? <p className="small">No changes recorded yet. Sample data isn’t logged.</p> : (
          <div className="log">
            {log.map((e) => (
              <div className="entry" key={e.id}>
                <div className="small">{new Date(e.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div>
                  <div className="kind">{e.kind}</div>
                  <div>{e.product_id && e.product_name ? <Link href={`/p/${e.product_id}`}>{e.product_name}</Link> : e.product_name}{e.product_name ? ': ' : ''}{e.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
