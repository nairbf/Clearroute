'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Flag,
  Eye,
  EyeOff,
  Trash2,
  Ban,
  Users,
  FileText,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatTimeAgo } from '@/lib/utils';

interface AdminDashboardProps {
  flaggedReports: any[];
  stats: {
    totalReports: number;
    totalUsers: number;
    reportsToday: number;
  };
}

export function AdminDashboard({ flaggedReports: initialReports, stats }: AdminDashboardProps) {
  const [reports, setReports] = useState(initialReports);
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const handleHide = async (reportId: string) => {
    setLoading(reportId);
    const { error } = await supabase
      .from('reports')
      .update({ status: 'hidden' })
      .eq('id', reportId);

    if (!error) {
      setReports(reports.filter(r => r.id !== reportId));
    }
    setLoading(null);
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to permanently delete this report?')) return;
    
    setLoading(reportId);
    const { error } = await supabase
      .from('reports')
      .update({ status: 'deleted' })
      .eq('id', reportId);

    if (!error) {
      setReports(reports.filter(r => r.id !== reportId));
    }
    setLoading(null);
  };

  const handleBanUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to ban @${username}?`)) return;
    
    const reason = prompt('Enter ban reason:');
    if (!reason) return;

    setLoading(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ 
        banned_at: new Date().toISOString(),
        ban_reason: reason 
      })
      .eq('id', userId);

    if (!error) {
      alert(`User @${username} has been banned.`);
    }
    setLoading(null);
  };

  const handleDismissFlags = async (reportId: string) => {
    setLoading(reportId);
    const { error } = await supabase
      .from('flags')
      .update({ reviewed_at: new Date().toISOString() })
      .eq('report_id', reportId);

    if (!error) {
      setReports(reports.filter(r => r.id !== reportId));
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-semibold">Admin Panel</h1>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <FileText size={18} />
              <span className="text-sm">Active Reports</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalReports}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Users size={18} />
              <span className="text-sm">Total Users</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <TrendingUp size={18} />
              <span className="text-sm">Reports Today</span>
            </div>
            <p className="text-2xl font-bold">{stats.reportsToday}</p>
          </div>
        </div>

        {/* Flagged Reports */}
        <div className="card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
            <Flag size={20} className="text-red-500" />
            <h2 className="font-semibold">Flagged Reports ({reports.length})</h2>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Flag size={48} className="mx-auto mb-4 opacity-50" />
              <p>No flagged reports to review</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {reports.map((report) => (
                <div key={report.id} className="p-4">
                  {/* Report info */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">
                        {report.location_name || report.road_name || 'Unknown location'}
                      </p>
                      <p className="text-sm text-slate-500">
                        by @{report.user?.username || 'Anonymous'} · {formatTimeAgo(report.created_at)}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                      {report.flag_count} flags
                    </span>
                  </div>

                  {/* Report content */}
                  <div className="bg-slate-100 rounded-lg p-3 mb-3">
                    <div className="flex gap-2 mb-2">
                      <span className={cn('badge text-xs', `badge-${report.condition}`)}>
                        {report.condition}
                      </span>
                      <span className={cn('badge text-xs', `badge-${report.passability}`)}>
                        {report.passability}
                      </span>
                    </div>
                    {report.notes && (
                      <p className="text-sm text-slate-700">"{report.notes}"</p>
                    )}
                  </div>

                  {/* Flag reasons */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Flag reasons:</p>
                    <div className="flex flex-wrap gap-1">
                      {report.flags?.map((flag: any) => (
                        <span
                          key={flag.id}
                          className="text-xs px-2 py-0.5 bg-slate-200 rounded"
                        >
                          {flag.reason}
                          {flag.details && `: ${flag.details.slice(0, 30)}...`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDismissFlags(report.id)}
                      disabled={loading === report.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      {loading === report.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Eye size={16} />
                      )}
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleHide(report.id)}
                      disabled={loading === report.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                    >
                      <EyeOff size={16} />
                      Hide
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      disabled={loading === report.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                    {report.user_id && (
                      <button
                        onClick={() => handleBanUser(report.user_id, report.user?.username)}
                        disabled={loading === report.user_id}
                        className="flex items-center justify-center gap-1 py-2 px-3 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
