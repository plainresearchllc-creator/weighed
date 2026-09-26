import type { Metadata } from 'next';
import Link from 'next/link';
import PhotoSlot from '@/components/PhotoSlot';
import { getSettings } from '@/lib/data';
import { CRITERIA, expertWeight, fmt1 } from '@/lib/scoring';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'How scoring works',
  description: 'How Weighed combines credentialed expert ballots with verified-purchase reviews into one published score.',
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

const RUBRIC: Record<string, { what: string; low: string; high: string }> = {
  evidence: {
    what: 'Is there good human research behind the active ingredients?',
    low: 'Animal or test-tube studies only, or no studies at all.',
    high: 'Several well-designed human trials showing a meaningful effect.',
  },
  dosing: {
    what: 'Does each serving contain the amount the research actually used?',
    low: 'Headline ingredients at a fraction of studied doses, or doses hidden in a blend.',
    high: 'Every active at or near the dose used in the studies.',
  },
  transparency: {
    what: 'Can you see exactly what you’re taking?',
    low: 'Proprietary blends that hide individual amounts.',
    high: 'Every ingredient and amount listed; third-party testing published.',
  },
  safety: {
    what: 'How likely is it to cause problems, and for whom?',
    low: 'High stimulant load, known interactions, or ingredients with safety warnings.',
    high: 'Well tolerated at the labeled dose, with clear cautions for at-risk groups.',
  },
  value: {
    what: 'What does an effective daily dose actually cost?',
    low: 'Expensive per effective dose, or cheap because it’s underdosed.',
    high: 'Fair price for a properly dosed, well-made product.',
  },
};

const FAQ = [
  {
    q: 'Can a brand pay to be ranked or to improve its score?',
    a: 'No. Brands can’t buy placement, reviews, or removal. Where we earn a commission from a retailer link, it’s labeled, and products without a commission are ranked exactly the same way.',
  },
  {
    q: 'Why not just average everyone’s rating?',
    a: 'Buyers are great at telling you how a product feels to use. They can’t see whether a dose matches the research or what’s hidden inside a proprietary blend. Experts can. Weighting the two gives you both views, and the disagreement flag shows you when they don’t line up.',
  },
  {
    q: 'Why the median expert score instead of the average?',
    a: 'A median ignores the one unusually harsh or generous ballot. If one panelist scores a 3 and the rest score around 8, the product still reads as an 8.',
  },
  {
    q: 'What happens when a product is reformulated?',
    a: 'Panelists re-score it, and the change is recorded in the public corrections log with the date and the reason.',
  },
  {
    q: 'Is a high score medical advice?',
    a: 'No. A score tells you how well a product is made and supported by evidence for most people. Your doctor or pharmacist should decide whether it’s right for you, especially if you take medication or are pregnant.',
  },
];

export default async function MethodPage() {
  const s = await getSettings();
  // Worked example uses the live settings.
  const exE = 8.4, exStars = 4.1, exN = 300;
  const exC = (exStars - 1) * 2.5;
  const exW = expertWeight(exN, s);
  const exTotal = exE * exW + exC * (1 - exW);

  return (
    <main className="wrap method">
      <section className="m-hero">
        <div>
          <div className="eyebrow">Methodology</div>
          <h1>How a product earns its score</h1>
          <p className="lede">
            Every Weighed score combines two independent signals: what trained experts conclude from the evidence, and what verified buyers
            experience. The formula is published, the ballots are public, and every change is logged. The numbers on this page are the live
            settings the site uses right now.
          </p>
          <div className="ctas">
            <Link className="btn primary lg" href="/">See the rankings</Link>
            <a className="btn lg" href="#faq">Common questions</a>
          </div>
        </div>
        <PhotoSlot file="hero.jpg" alt="A researcher reviewing a supplement label in a lab" ratio="5 / 4" />
      </section>

      <section className="m-sec">
        <div className="m-kicker">Why this exists</div>
        <div className="m-body">
          <h2>Most supplement rankings can’t be checked</h2>
          <p>
            Labels hide doses inside proprietary blends. Star ratings are padded with incentivized and fake reviews. And many “best of” lists
            are ordered by who pays the highest commission. Weighed is built so you can check every step: who scored a product, what they
            said, how buyers rated it, and exactly how those numbers were combined.
          </p>
        </div>
      </section>

      <div className="m-steps" aria-label="The three steps">
        <div><b>1</b><span>Expert panel score</span></div>
        <div className="op">+</div>
        <div><b>2</b><span>Verified customer score</span></div>
        <div className="op">=</div>
        <div className="dark"><b>3</b><span>Weighed score</span></div>
      </div>

      <section className="m-sec split">
        <PhotoSlot file="panel.jpg" alt="A dietitian taking notes while comparing product labels" />
        <div className="m-body">
          <div className="m-kicker">Step 1</div>
          <h2>The expert panel score</h2>
          <p>
            Each category has its own panel of 8–15 credentialed professionals: registered dietitians, physicians, pharmacists, and
            researchers matched to the category. Each panelist scores every product on the same five criteria, from 0 to 10, and writes a
            short rationale that’s published under their name.
          </p>
          <p>
            Panelists score independently. A ballot’s score is the average of its five criteria, and the product’s expert score is the{' '}
            <b>median</b> ballot, so no single reviewer can move it. A product needs at least {s.min_ballots} ballots before it’s ranked;
            until then it’s shown as provisional.
          </p>
        </div>
      </section>

      <section className="m-sec">
        <div className="m-kicker">The rubric</div>
        <div className="m-body">
          <h2>What experts score, and what the scale means</h2>
          <div className="tablewrap">
            <table className="rubric">
              <thead><tr><th>Criterion</th><th>The question</th><th>Scores low (0–3)</th><th>Scores high (8–10)</th></tr></thead>
              <tbody>
                {CRITERIA.map((c) => (
                  <tr key={c.key}>
                    <td><b>{c.label}</b></td>
                    <td>{RUBRIC[c.key].what}</td>
                    <td>{RUBRIC[c.key].low}</td>
                    <td>{RUBRIC[c.key].high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="m-sec split reverse">
        <PhotoSlot file="reviews.jpg" alt="A customer opening a delivered package at home" />
        <div className="m-body">
          <div className="m-kicker">Step 2</div>
          <h2>The verified customer score</h2>
          <p>
            Only reviews tied to a confirmed purchase count. Before a review is included, we filter out the patterns that usually mean it
            isn’t genuine:
          </p>
          <ul className="m-list">
            <li><b>Incentivized reviews</b> written in exchange for free product, discounts or payment.</li>
            <li><b>Bursts</b>: large numbers of reviews posted in a short window, often around a launch.</li>
            <li><b>Duplicates</b>: the same or near-identical text across reviews or products.</li>
            <li><b>Unverified accounts</b> with no purchase on record.</li>
          </ul>
          <p>
            The remaining average star rating converts to the 10-point scale: 1 star = 0, 3 stars = 5, 5 stars = 10. Each product page shows
            how many reviews counted and how many were removed.
          </p>
        </div>
      </section>

      <section className="m-sec">
        <div className="m-kicker">Step 3</div>
        <div className="m-body">
          <h2>Combining the two</h2>
          <p>
            Once a product has {s.full_weight_reviews} or more verified reviews, the score is{' '}
            <b>Expert × {pct(s.base_expert_weight)} + Customer × {pct(1 - s.base_expert_weight)}</b>. With fewer reviews, a handful of
            ratings could swing the result, so the expert share rises, up to {pct(s.max_expert_weight)} at {s.min_weight_reviews} reviews or
            fewer, and slides smoothly in between.
          </p>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Verified reviews</th><th className="num">Expert share</th><th className="num">Customer share</th></tr></thead>
              <tbody>
                {[s.min_weight_reviews, Math.round((s.min_weight_reviews + s.full_weight_reviews) / 2), s.full_weight_reviews].map((n, i) => {
                  const w = expertWeight(n, s);
                  const label = i === 0 ? `${n} or fewer` : i === 2 ? `${n} or more` : `${n}`;
                  return <tr key={n}><td>{label}</td><td className="num">{pct(w)}</td><td className="num">{pct(1 - w)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="m-example">
            <div className="eyebrow">Worked example</div>
            <p>
              A product with a median expert score of <b>{fmt1(exE)}</b> and an average of <b>{exStars} stars</b> from {exN} verified
              reviews. The stars convert to <b>{fmt1(exC)}</b>, and with {exN} reviews the expert share is <b>{pct(exW)}</b>:
            </p>
            <p className="m-formula">({fmt1(exE)} × {exW.toFixed(2)}) + ({fmt1(exC)} × {(1 - exW).toFixed(2)}) = <b>{fmt1(exTotal)}</b></p>
          </div>
        </div>
      </section>

      <section className="m-sec">
        <div className="m-kicker">Step 4</div>
        <div className="m-body">
          <h2>When experts and buyers disagree</h2>
          <p>
            If the expert and customer scores differ by {s.disagreement_gap.toFixed(1)} points or more, the product is marked{' '}
            <span className="pill disagree">Disagree</span> and the page says which side rates it higher. Disagreement is useful: a product
            buyers love but experts can’t verify often has a strong stimulant kick and a hidden blend. A product experts rate highly but buyers
            don’t may be effective but hard to stick with.
          </p>
        </div>
      </section>

      <section className="m-sec split">
        <PhotoSlot file="retail.jpg" alt="Supplement bottles on a store shelf" />
        <div className="m-body">
          <div className="m-kicker">Independence</div>
          <h2>How we keep scores honest</h2>
          <ul className="m-list">
            <li><b>Verified credentials.</b> Every panelist’s license or registration is confirmed with the issuing board.</li>
            <li><b>Conflicts disclosed.</b> Panelists disclose financial ties to brands from the past 24 months. Any brand they have ties to is blocked from their ballot.</li>
            <li><b>Paid for time, not outcomes.</b> Panelists receive a flat fee per review cycle that never depends on their scores.</li>
            <li><b>Bought at retail.</b> We purchase every product ourselves. Brands never choose what panelists receive.</li>
            <li><b>Public corrections.</b> New ballots, withdrawn ballots, review updates and changes to this method are logged automatically in the <Link href="/corrections">corrections log</Link>.</li>
          </ul>
        </div>
      </section>

      <section className="m-sec" id="faq">
        <div className="m-kicker">FAQ</div>
        <div className="m-body">
          <h2>Common questions</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="ctaband alt">
        <div>
          <h2>See the method in action</h2>
          <p>Every product page shows its ballots, its reviews and the exact formula behind its score.</p>
        </div>
        <Link className="btn primary lg" href="/">Browse the rankings</Link>
      </section>
    </main>
  );
}
