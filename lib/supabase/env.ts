// Cleans up the Supabase settings so a stray space, line break, trailing slash
// or copied "/rest/v1" in Vercel can't break requests.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .trim()
  .replace(/\s+/g, '')
  .replace(/\/(rest|auth|storage)\/v1\/?$/i, '')
  .replace(/\/+$/, '');

export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim().replace(/\s+/g, '');
