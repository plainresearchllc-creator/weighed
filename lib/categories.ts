export const CATEGORIES = [
  { slug: 'weight-loss', name: 'Weight Loss' },
  { slug: 'skincare', name: 'Skincare' },
  { slug: 'sleep-stress', name: 'Sleep & Stress' },
  { slug: 'sports-nutrition', name: 'Sports Nutrition' },
  { slug: 'gut-health', name: 'Gut Health' },
] as const;

export type CategoryName = (typeof CATEGORIES)[number]['name'];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function slugFor(name: string) {
  return CATEGORIES.find((c) => c.name === name)?.slug ?? 'weight-loss';
}
