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

// GET /api/reports
export async function GET(request: NextRequest) {
  const supabase = await createSupabase();
  const { searchParams } = new URL(request.url);

  const section = searchParams.get('section') || 'recent'; // 'recent' or 'older'
  const county = searchParams.get('county');
  const condition = searchParams.get('condition');
  const passability = searchParams.get('passability');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Recent = last 12 hours, Older = 12-48 hours ago
  const now = Date.now();
  const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('reports')
    .select(`
      *,
      user:profiles!user_id(username, trust_score)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (section === 'recent') {
    // Recent: created in last 12 hours, status = active
    query = query
      .gte('created_at', twelveHoursAgo)
      .eq('status', 'active');
  } else {
    // Older: created 12-48 hours ago, any status
    query = query
      .lt('created_at', twelveHoursAgo)
      .gte('created_at', fortyEightHoursAgo);
  }

  if (county) query = query.eq('county', county);
  if (condition) query = query.eq('condition', condition);
  if (passability) query = query.eq('passability', passability);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reports = (data || []).map((report: any) => ({
    ...report,
    location: parseLocation(report),
  }));

  console.log(`API: ${section} - ${reports.length} reports`);

  return NextResponse.json({ reports });
}

// POST schema
const createReportSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  location_name: z.string().optional(),
  road_name: z.string().optional(),
  county: z.enum(['onondaga', 'oswego', 'madison', 'cayuga', 'oneida', 'cortland']),
  condition: z.enum(['clear', 'wet', 'slush', 'snow', 'ice', 'whiteout']),
  passability: z.enum(['ok', 'slow', 'avoid']),
  notes: z.string().max(500).optional(),
  photo_urls: z.array(z.string()).optional(),
});

// POST /api/reports
export async function POST(request: NextRequest) {
  const supabase = await createSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const { lat, lng, location_name, road_name, county, condition, passability, notes, photo_urls } = parsed.data;

  let finalLocationName: string;
  if (road_name) {
    finalLocationName = `${road_name} (${lat}, ${lng})`;
  } else if (location_name) {
    if (location_name.includes(String(lat))) {
      finalLocationName = location_name;
    } else {
      finalLocationName = `${location_name} (${lat}, ${lng})`;
    }
  } else {
    finalLocationName = `${lat}, ${lng}`;
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      location_name: finalLocationName,
      road_name,
      county,
      condition,
      passability,
      notes,
      photo_urls: photo_urls || [],
      status: 'active',
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}