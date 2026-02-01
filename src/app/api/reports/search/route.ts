import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  const supabase = await createSupabase();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (query.length < 2) {
    return NextResponse.json({ reports: [] });
  }

  // Search by road_name, location_name, or county
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      user:profiles!user_id(username, trust_score)
    `)
    .eq('status', 'active')
    .or(`road_name.ilike.%${query}%,location_name.ilike.%${query}%,county.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform location
  const reports = (data || []).map((report: any) => {
    let location = null;
    if (report.location_name) {
      const coordMatch = report.location_name.match(/([\d.-]+),\s*([\d.-]+)/);
      if (coordMatch) {
        location = {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2]),
        };
      }
    }
    return { ...report, location };
  });

  return NextResponse.json({ reports });
}