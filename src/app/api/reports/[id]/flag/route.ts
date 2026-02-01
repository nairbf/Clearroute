import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

async function createSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );
}

const flagSchema = z.object({
  reason: z.enum(['inaccurate', 'outdated', 'spam', 'inappropriate', 'wrong_location', 'other']),
  details: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createSupabase();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  // Check if user already flagged this report
  const { data: existing } = await supabase
    .from('flags')
    .select('id')
    .eq('report_id', reportId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You have already flagged this report' }, { status: 400 });
  }

  // Check user isn't flagging their own report
  const { data: report } = await supabase
    .from('reports')
    .select('user_id')
    .eq('id', reportId)
    .single();

  if (report?.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot flag your own report' }, { status: 400 });
  }

  // Insert flag
  const { data, error } = await supabase
    .from('flags')
    .insert({
      report_id: reportId,
      user_id: user.id,
      reason: parsed.data.reason,
      details: parsed.data.details,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}