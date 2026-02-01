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

function parseLocation(report: any): { lat: number; lng: number } | null {
  const locationName = report.location_name || '';
  
  const pattern = locationName.match(/\((?:near\s*)?([-]?\d+\.?\d*),\s*([-]?\d+\.?\d*)\)/);
  if (pattern) {
    const lat = parseFloat(pattern[1]);
    const lng = parseFloat(pattern[2]);
    if (lat >= 41 && lat <= 46 && lng >= -78 && lng <= -73) {
      return { lat, lng };
    }
  }

  const pattern2 = locationName.match(/([-]?\d{2,3}\.\d+),\s*([-]?\d{2,3}\.\d+)/);
  if (pattern2) {
    let lat = parseFloat(pattern2[1]);
    let lng = parseFloat(pattern2[2]);
    if (lat < -70 && lng > 0) {
      [lat, lng] = [lng, lat];
    }
    if (lat >= 41 && lat <= 46 && lng >= -78 && lng <= -73) {
      return { lat, lng };
    }
  }

  return null;
}

// GET /api/reports/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabase();

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      user:profiles!user_id(username, trust_score),
      comments(
        id,
        content,
        created_at,
        user:profiles!user_id(username)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const report = {
    ...data,
    location: parseLocation(data),
  };

  return NextResponse.json(report);
}