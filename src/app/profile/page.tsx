'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Star, 
  FileText, 
  CheckCircle, 
  Edit2, 
  Save,
  Loader2,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatTimeAgo } from '@/lib/utils';
import { ReportCard } from '@/components/ReportCard';
import type { Report } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Fetch user's reports
  const { data: myReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['my-reports', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform location
      return (data || []).map((report: any) => {
        let location = null;
        if (report.location_name) {
          const coordMatch = report.location_name.match(/^([\d.-]+),\s*([\d.-]+)$/);
          if (coordMatch) {
            location = {
              lat: parseFloat(coordMatch[1]),
              lng: parseFloat(coordMatch[2]),
            };
          }
        }
        return { ...report, location, user: profile };
      }) as Report[];
    },
    enabled: !!user,
  });

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername === profile?.username) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ username: newUsername.trim() });
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update username. It may already be taken.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-xl font-semibold mb-2">Sign in required</h1>
        <p className="text-slate-600 mb-4">Please sign in to view your profile.</p>
        <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">
          Go Home
        </Link>
      </div>
    );
  }

  const trustLevel = Math.min(3, Math.max(1, Math.ceil((profile?.trust_score || 0) / 25)));
  const trustLabels = ['New Reporter', 'Trusted Reporter', 'Verified Reporter'];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg">My Profile</h1>
        </div>
      </header>

      {/* Profile card */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Avatar and name */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={32} className="text-blue-600" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-lg font-semibold"
                    placeholder="Username"
                    maxLength={30}
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={saving}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">@{profile?.username}</h2>
                  <button
                    onClick={() => {
                      setNewUsername(profile?.username || '');
                      setIsEditing(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              <p className="text-slate-500 text-sm">
                Member since {profile?.created_at ? formatTimeAgo(profile.created_at) : 'recently'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Star size={20} fill="currentColor" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{profile?.trust_score || 0}</div>
              <div className="text-xs text-slate-500">Trust Score</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                <FileText size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{profile?.report_count || 0}</div>
              <div className="text-xs text-slate-500">Reports</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <CheckCircle size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{profile?.accurate_count || 0}</div>
              <div className="text-xs text-slate-500">Confirmed</div>
            </div>
          </div>

          {/* Trust level badge */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg mb-6">
            <div>
              <div className="font-medium text-amber-900">{trustLabels[trustLevel - 1]}</div>
              <div className="text-xs text-amber-700">
                {trustLevel < 3 
                  ? `${(trustLevel * 25) - (profile?.trust_score || 0)} more points to next level`
                  : 'Highest trust level achieved!'
                }
              </div>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3].map((level) => (
                <Star 
                  key={level} 
                  size={20} 
                  className={level <= trustLevel ? 'text-amber-500' : 'text-slate-300'}
                  fill={level <= trustLevel ? 'currentColor' : 'none'}
                />
              ))}
            </div>
          </div>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* My reports */}
      <div className="px-4 pb-8">
        <h3 className="font-semibold text-slate-900 mb-3">My Reports</h3>
        
        {loadingReports ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="h-5 w-32 bg-slate-200 animate-pulse rounded mb-2" />
                <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : myReports.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-slate-600">You haven't submitted any reports yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}