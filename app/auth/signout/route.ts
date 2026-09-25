import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
