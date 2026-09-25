import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

export default function CategoryBar({ active, counts }: { active: string; counts: Record<string, number> }) {
  return (
    <div className="cats">
      <div className="wrap">
        <nav className="row" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="chip" aria-current={c.slug === active ? 'page' : undefined}>
              {c.name}
              <span className="n">{counts[c.name] ?? 0}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="fade" aria-hidden="true" />
    </div>
  );
}
