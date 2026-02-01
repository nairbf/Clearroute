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

// GET /api/reports/[id]/updates - Get updates for a report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabase();

  const { data, error } = await supabase
    .from('road_updates')
    .select(`
      *,
      user:profiles!user_id(username)
    `)
    .eq('report_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updates: data });
}

// POST /api/reports/[id]/updates - Add an update
const updateSchema = z.object({
  update_type: z.enum(['plowed', 'clearing', 'worse', 'same']),
  notes: z.string().max(200).optional(),
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  // Check if user already submitted an update for this report
  const { data: existing } = await supabase
    .from('road_updates')
    .select('id')
    .eq('report_id', reportId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('road_updates')
      .update({
        update_type: parsed.data.update_type,
        notes: parsed.data.notes,
        created_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  // Insert new update
  const { data, error } = await supabase
    .from('road_updates')
    .insert({
      report_id: reportId,
      user_id: user.id,
      update_type: parsed.data.update_type,
      notes: parsed.data.notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}