import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reports/[id] - Get single report with comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { id } = params;

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      user:profiles!user_id(username, trust_score),
      comments(
        *,
        user:profiles!user_id(username, trust_score)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform location
  let location = null;
  if (data.location && typeof data.location === 'object' && data.location.coordinates) {
    location = {
      lat: data.location.coordinates[1],
      lng: data.location.coordinates[0],
    };
  }

  return NextResponse.json({
    ...data,
    location,
  });
}
