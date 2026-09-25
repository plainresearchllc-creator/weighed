import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/data';
import { CRITERIA } from '@/lib/scoring';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'How scoring works' };

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function MethodPage() {
  const s = await getSettings();
  return (
    <main className="wrap">
      <div className="eyebrow">Methodology</div>
      <h1>How a product earns its score</h1>
      <p className="lede">Two independent signals, combined with a published formula. The numbers on this page are the live settings the site uses right now.</p>
      <div className="admin" style={{ marginTop: 28 }}>
        <div className="panel"><h3>1. Expert panel score</h3>
          <p>Each expert scores five criteria from 0 to 10: {CRITERIA.map((c) => c.label.toLowerCase()).join(', ')}. A ballot’s score is the average of its five criteria. The product’s expert score is the <b>median</b> ballot, so one outlier can’t move it. A product needs {s.min_ballots} ballots before it is ranked.</p></div>
        <div className="panel"><h3>2. Verified customer score</h3>
          <p>Only confirmed-purchase reviews count, and suspected fakes are removed. The average star rating converts to a 10-point scale: 1 star = 0, 3 stars = 5, 5 stars = 10.</p></div>
        <div className="panel"><h3>3. The Weighed score</h3>
          <p>Expert × {pct(s.base_expert_weight)} + Customer × {pct(1 - s.base_expert_weight)} once a product has {s.full_weight_reviews}+ verified reviews. At {s.min_weight_reviews} reviews or fewer the expert share is {pct(s.max_expert_weight)}, and it slides smoothly between those points.</p></div>
        <div className="panel"><h3>4. Disagreement flag</h3>
          <p>When expert and customer scores differ by {s.disagreement_gap.toFixed(1)} points or more, the product is marked “Disagree” and the page says which side rates it higher.</p></div>
        <div className="panel"><h3>Who can vote</h3>
          <p>Panelists’ licenses are checked with the issuing board. Each panelist discloses financial ties to brands, and any brand they have ties to is blocked from their ballot. Panelists are paid a flat fee per review cycle that never depends on their scores.</p></div>
        <div className="panel"><h3>Every change is public</h3>
          <p>New ballots, withdrawn ballots, customer data updates and changes to this method are all recorded in the <Link href="/corrections">corrections log</Link>.</p></div>
      </div>
    </main>
  );
}
