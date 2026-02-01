import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// GET /api/reports - Fetch reports with filters
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  // Parse query params
  const minutes = parseInt(searchParams.get('minutes') || '60');
  const county = searchParams.get('county');
  const condition = searchParams.get('condition');
  const passability = searchParams.get('passability');
  const limit = parseInt(searchParams.get('limit') || '50');
  const cursor = searchParams.get('cursor');

  // Build query
  let query = supabase
    .from('reports')
    .select(`
      *,
      user:profiles!user_id(username, trust_score)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Time filter
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  query = query.gte('created_at', since);

  // County filter
  if (county && county !== 'all') {
    query = query.eq('county', county);
  }

  // Condition filter
  if (condition && condition !== 'all') {
    query = query.eq('condition', condition);
  }

  // Passability filter
  if (passability && passability !== 'all') {
    query = query.eq('passability', passability);
  }

  // Cursor pagination
  if (cursor) {
    query = query.lt('id', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform PostGIS point to simple lat/lng
  const reports = (data || []).map((report: any) => {
    let location = null;
    if (report.location) {
      // PostGIS returns as GeoJSON or WKT depending on config
      if (typeof report.location === 'object' && report.location.coordinates) {
        location = {
          lat: report.location.coordinates[1],
          lng: report.location.coordinates[0],
        };
      }
    }
    return {
      ...report,
      location,
    };
  });

  return NextResponse.json({
    reports,
    next_cursor: reports.length === limit ? reports[reports.length - 1]?.id : null,
  });
}

// POST /api/reports - Create a new report
const createReportSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  location_name: z.string().max(200).optional(),
  county: z.enum(['onondaga', 'oswego', 'madison', 'cayuga', 'oneida', 'cortland']),
  road_name: z.string().max(100).optional(),
  condition: z.enum(['clear', 'wet', 'slush', 'snow', 'ice', 'whiteout']),
  passability: z.enum(['ok', 'slow', 'avoid']),
  notes: z.string().max(500).optional(),
  photo_urls: z.array(z.string().url()).max(5).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is banned
  const { data: profile } = await supabase
    .from('profiles')
    .select('banned_at')
    .eq('id', user.id)
    .single();

  if (profile?.banned_at) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  // Parse and validate body
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

  const input = parsed.data;

  // Rate limiting check (simple: max 10 reports per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);

  if ((count || 0) >= 10) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 reports per hour.' },
      { status: 429 }
    );
  }

  // Calculate expiration based on condition
  const expirationHours: Record<string, number> = {
    clear: 2,
    wet: 3,
    slush: 3,
    snow: 4,
    ice: 4,
    whiteout: 2,
  };
  const hours = expirationHours[input.condition] || 4;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  // Insert report
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      location: `SRID=4326;POINT(${input.lng} ${input.lat})`,
      location_name: input.location_name,
      county: input.county,
      road_name: input.road_name,
      condition: input.condition,
      passability: input.passability,
      notes: input.notes,
      photo_urls: input.photo_urls || [],
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update user's report count
  await supabase.rpc('increment_report_count', { user_id: user.id });

  return NextResponse.json(data, { status: 201 });
}
