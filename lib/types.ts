export type Role = 'viewer' | 'panelist' | 'admin';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  summary: string | null;
  review_count: number;
  avg_rating: number | null;
  filtered_count: number;
  image_path: string | null;
  is_sample: boolean;
  created_at: string;
}

export interface Ballot {
  id: string;
  product_id: string;
  expert_id: string | null;
  expert_name: string;
  credential: string | null;
  role_title: string | null;
  evidence: number;
  dosing: number;
  transparency: number;
  safety: number;
  value: number;
  rationale: string | null;
  is_sample: boolean;
  created_at: string;
}

export interface Settings {
  base_expert_weight: number;
  max_expert_weight: number;
  full_weight_reviews: number;
  min_weight_reviews: number;
  disagreement_gap: number;
  min_ballots: number;
}

export interface Press {
  id: string;
  outlet: string;
  headline: string;
  url: string;
  published_on: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  credential: string | null;
  role_title: string | null;
  role: Role;
}

export interface LogEntry {
  id: number;
  product_id: string | null;
  product_name: string | null;
  kind: string;
  detail: string;
  changed_at: string;
}
