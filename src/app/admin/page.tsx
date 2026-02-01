import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminDashboard } from './AdminDashboard';

export default async function AdminPage() {
  const supabase = createServerSupabaseClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/');
  }

  // Check if user is admin/mod
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['moderator', 'admin'].includes(profile.role)) {
    redirect('/');
  }

  // Fetch flagged reports
  const { data: flaggedReports } = await supabase
    .from('reports')
    .select(`
      *,
      user:profiles!user_id(username),
      flags(
        *,
        user:profiles!user_id(username)
      )
    `)
    .gt('flag_count', 0)
    .order('flag_count', { ascending: false })
    .limit(50);

  // Fetch stats
  const { count: totalReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: reportsToday } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return (
    <AdminDashboard
      flaggedReports={flaggedReports || []}
      stats={{
        totalReports: totalReports || 0,
        totalUsers: totalUsers || 0,
        reportsToday: reportsToday || 0,
      }}
    />
  );
}
