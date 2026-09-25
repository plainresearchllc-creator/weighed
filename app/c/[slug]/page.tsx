import type { Metadata } from 'next';
import RankingView from '@/components/RankingView';
import { categoryBySlug } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = categoryBySlug(params.slug);
  return { title: c ? `Best ${c.name} products, scored by experts` : 'Rankings' };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  return <RankingView slug={params.slug} />;
}
