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

// Helper to parse location from location_name
function parseLocation(report: any): { lat: number; lng: number } | null {
  const locationName = report.location_name || '';
  
  // Pattern 1: "Road Name (43.1234, -76.5678)" or "Road Name (near 43.1234, -76.5678)"
  const pattern1 = locationName.match(/\((?:near\s*)?([-]?\d+\.?\d*),\s*([-]?\d+\.?\d*)\)/);
  if (pattern1) {
    const lat = parseFloat(pattern1[1]);
    const lng = parseFloat(pattern1[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Pattern 2: "43.1234, -76.5678" (just coordinates)
  const pattern2 = locationName.match(/^([-]?\d+\.?\d*),\s*([-]?\d+\.?\d*)$/);
  if (pattern2) {
    const lat = parseFloat(pattern2[1]);
    const lng = parseFloat(pattern2[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Pattern 3: Any coordinates in the string
  const pattern3 = locationName.match(/([-]?\d{2,3}\.\d+),\s*([-]?\d{2,3}\.\d+)/);
  if (pattern3) {
    let lat = parseFloat(pattern3[1]);
    let lng = parseFloat(pattern3[2]);
    
    // If lat is negative and large, it's probably the longitude (swap them)
    if (lat < -70 && lng > 0) {
      [lat, lng] = [lng, lat];
    }
    
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

// Validate coordinates are in CNY region
function isValidCoordinate(lat: number, lng: number): boolean {
  // CNY is roughly: lat 42-45, lng -77 to -74
  return lat >= 41 && lat <= 46 && lng >= -78 && lng <= -73;
}

// GET /api/reports
export async function GET(request: NextRequest) {
  const supabase = await createSupabase();
  const { searchParams } = new URL(request.url);

  const minutes = parseInt(searchParams.get('minutes') || '60');
  const county = searchParams.get('county');
  const condition = searchParams.get('condition');
  const passability = searchParams.get('passability');
  const limit = parseInt(searchParams.get('limit') || '50');
  const includeExpired = searchParams.get('includeExpired') === 'true';

  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  let query = supabase
    .from('reports')
    .select(`
      *,
      user:profiles!user_id(username, trust_score)
    `)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter by status - include expired if requested
  if (includeExpired) {
    query = query.in('status', ['active', 'expired']);
  } else {
    query = query.eq('status', 'active');
  }

  if (county) query = query.eq('county', county);
  if (condition) query = query.eq('condition', condition);
  if (passability) query = query.eq('passability', passability);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform reports with parsed locations
  const reports = (data || []).map((report: any) => ({
    ...report,
    location: parseLocation(report),
  }));

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

  // Store coordinates in location_name for easy parsing
  // Format: "Road Name (lat, lng)" or just "lat, lng"
  let finalLocationName: string;
  if (road_name) {
    finalLocationName = `${road_name} (${lat}, ${lng})`;
  } else if (location_name) {
    // Check if location_name already has coordinates
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
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await supabase.rpc('increment_report_count', { p_user_id: user.id });
  } catch (e) {
    console.error('Failed to increment report count:', e);
  }

  return NextResponse.json(data, { status: 201 });
}