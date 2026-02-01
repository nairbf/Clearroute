'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Shield, 
  Trash2, 
  EyeOff, 
  Flag,
  Users,
  FileText,
  AlertTriangle,
  Loader2,
  RefreshCw,
  MapPin,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatTimeAgo, cn } from '@/lib/utils';
import type { Report } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [flaggedReports, setFlaggedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'flagged'>('all');
  const [stats, setStats] = useState({ total: 0, flagged: 0, users: 0 });
  const supabase = createClient();

  // Check if user is admin
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  useEffect(() => {
    if (profile && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadData();
    }
  }, [profile, isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all reports
      const { data: allReports } = await supabase
        .from('reports')
        .select(`
          *,
          user:profiles!user_id(username, trust_score)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Transform and set reports
      const transformedReports = (allReports || []).map((report: any) => ({
        ...report,
        location: report.location_name ? { lat: 0, lng: 0 } : null,
      }));

      setReports(transformedReports);
      setFlaggedReports(transformedReports.filter((r: Report) => r.flag_count > 0));

      // Get stats
      const { count: totalReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: flaggedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .gt('flag_count', 0);

      setStats({
        total: totalReports || 0,
        flagged: flaggedCount || 0,
        users: totalUsers || 0,
      });

    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHideReport = async (reportId: string) => {
    if (!confirm('Hide this report? It will no longer be visible to users.')) return;
    
    setActionLoading(reportId);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'hidden' })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(reports.filter(r => r.id !== reportId));
      setFlaggedReports(flaggedReports.filter(r => r.id !== reportId));
      setStats(s => ({ ...s, total: s.total - 1 }));

    } catch (error) {
      alert('Failed to hide report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Permanently DELETE this report? This cannot be undone.')) return;
    
    setActionLoading(reportId);
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(reports.filter(r => r.id !== reportId));
      setFlaggedReports(flaggedReports.filter(r => r.id !== reportId));
      setStats(s => ({ ...s, total: s.total - 1 }));

    } catch (error) {
      alert('Failed to delete report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearFlags = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      // Delete all flags for this report
      await supabase
        .from('flags')
        .delete()
        .eq('report_id', reportId);

      // Reset flag count
      await supabase
        .from('reports')
        .update({ flag_count: 0 })
        .eq('id', reportId);

      // Update local state
      setReports(reports.map(r => r.id === reportId ? { ...r, flag_count: 0 } : r));
      setFlaggedReports(flaggedReports.filter(r => r.id !== reportId));
      setStats(s => ({ ...s, flagged: s.flagged - 1 }));

    } catch (error) {
      alert('Failed to clear flags');
    } finally {
      setActionLoading(null);
    }
  };

  // Not logged in or not admin
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <Shield size={64} className="text-slate-300 mb-4" />
        <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-4">You don't have permission to access this page.</p>
        <Link href="/" className="text-blue-600 font-medium">Go Home</Link>
      </div>
    );
  }

  const displayReports = activeTab === 'flagged' ? flaggedReports : reports;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 -ml-2 hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg flex items-center gap-2">
              <Shield size={20} />
              Admin Panel
            </h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <FileText size={18} />
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-slate-500">Total Reports</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <Flag size={18} />
            </div>
            <div className="text-2xl font-bold">{stats.flagged}</div>
            <div className="text-xs text-slate-500">Flagged</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Users size={18} />
            </div>
            <div className="text-2xl font-bold">{stats.users}</div>
            <div className="text-xs text-slate-500">Users</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            All Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('flagged')}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'flagged' 
                ? 'bg-red-600 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            Flagged ({flaggedReports.length})
          </button>
        </div>
      </div>

      {/* Reports list */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : displayReports.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-slate-600">
              {activeTab === 'flagged' ? 'No flagged reports!' : 'No reports yet.'}
            </p>
          </div>
        ) : (
          displayReports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Report header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold uppercase',
                      report.condition === 'clear' && 'bg-green-100 text-green-800',
                      report.condition === 'wet' && 'bg-blue-100 text-blue-800',
                      report.condition === 'slush' && 'bg-amber-100 text-amber-800',
                      report.condition === 'snow' && 'bg-orange-100 text-orange-800',
                      report.condition === 'ice' && 'bg-red-100 text-red-800',
                      report.condition === 'whiteout' && 'bg-purple-100 text-purple-800',
                    )}>
                      {report.condition}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      report.passability === 'ok' && 'bg-green-100 text-green-800',
                      report.passability === 'slow' && 'bg-amber-100 text-amber-800',
                      report.passability === 'avoid' && 'bg-red-100 text-red-800',
                    )}>
                      {report.passability}
                    </span>
                    {report.flag_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white flex items-center gap-1">
                        <Flag size={10} />
                        {report.flag_count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {report.status}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-slate-700 mb-1">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="font-medium text-sm">
                    {report.road_name || report.location_name || 'Unknown'}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>@{report.user?.username || 'Unknown'}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatTimeAgo(report.created_at)}
                  </span>
                  <span className="capitalize">{report.county}</span>
                </div>

                {/* Notes */}
                {report.notes && (
                  <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                    "{report.notes}"
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex border-t border-slate-100">
                {report.flag_count > 0 && (
                  <button
                    onClick={() => handleClearFlags(report.id)}
                    disabled={actionLoading === report.id}
                    className="flex-1 flex items-center justify-center gap-1 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
                  >
                    {actionLoading === report.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Flag size={16} />
                        Clear Flags
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleHideReport(report.id)}
                  disabled={actionLoading === report.id}
                  className="flex-1 flex items-center justify-center gap-1 py-3 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                >
                  {actionLoading === report.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <EyeOff size={16} />
                      Hide
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteReport(report.id)}
                  disabled={actionLoading === report.id}
                  className="flex-1 flex items-center justify-center gap-1 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  {actionLoading === report.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}