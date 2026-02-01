'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft,
  ThumbsUp, 
  CheckCircle, 
  Flag, 
  MapPin,
  Star,
  Send,
  Loader2,
  Snowflake
} from 'lucide-react';
import { useReport, useUpvote, useConfirm, useAddComment, useHasUpvoted, useHasConfirmed } from '@/hooks/useReports';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatTimeAgo, getConditionColor } from '@/lib/utils';
import type { RoadCondition, Passability } from '@/types';

const conditionLabels: Record<RoadCondition, string> = {
  clear: 'Clear',
  wet: 'Wet',
  slush: 'Slush',
  snow: 'Snow',
  ice: 'Ice',
  whiteout: 'Whiteout',
};

const passabilityLabels: Record<Passability, string> = {
  ok: 'OK to drive',
  slow: 'Slow down',
  avoid: 'Avoid',
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const { user } = useAuth();
  const { data: report, isLoading, error } = useReport(reportId);
  const { data: hasUpvoted } = useHasUpvoted(reportId);
  const { data: hasConfirmed } = useHasConfirmed(reportId);
  
  const upvoteMutation = useUpvote();
  const confirmMutation = useConfirm();
  const addCommentMutation = useAddComment();
  
  const [comment, setComment] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);

  const handleUpvote = () => {
    if (!user) return;
    upvoteMutation.mutate({ reportId, remove: hasUpvoted });
  };

  const handleConfirm = () => {
    if (!user || hasConfirmed) return;
    confirmMutation.mutate(reportId);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    
    addCommentMutation.mutate(
      { reportId, content: comment.trim() },
      { onSuccess: () => setComment('') }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-xl font-semibold mb-2">Report not found</h1>
        <p className="text-slate-600 mb-4">This report may have expired or been removed.</p>
        <Link href="/" className="btn-primary">
          Back to Map
        </Link>
      </div>
    );
  }

  const trustStars = Math.min(3, Math.max(1, Math.ceil((report.user?.trust_score || 0) / 20)));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">Report Details</h1>
        </div>
      </header>

      {/* Photo carousel */}
      {report.photo_urls.length > 0 && (
        <div className="relative bg-slate-900">
          <div className="aspect-video relative">
            <Image
              src={report.photo_urls[photoIndex]}
              alt="Road condition"
              fill
              className="object-contain"
              priority
            />
          </div>
          {report.photo_urls.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {report.photo_urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === photoIndex ? 'bg-white' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Condition badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className={cn('badge', `badge-${report.condition}`)}>
            {conditionLabels[report.condition]}
          </span>
          <span className={cn('badge', `badge-${report.passability}`)}>
            {passabilityLabels[report.passability]}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-slate-900 mb-1">
          <MapPin size={16} className="text-slate-400" />
          <span className="font-semibold text-lg">
            {report.location_name || report.road_name || 'Unknown location'}
          </span>
        </div>
        <p className="text-slate-500 capitalize mb-4">
          {report.county} County
        </p>

        {/* Time */}
        <p className="text-sm text-slate-500 mb-4">
          Reported {formatTimeAgo(report.created_at)}
          {report.confirmation_count > 0 && (
            <> · Last confirmed {formatTimeAgo(report.last_confirmed_at)}</>
          )}
        </p>

        {/* Notes */}
        {report.notes && (
          <div className="bg-slate-100 rounded-lg p-4 mb-4">
            <p className="text-slate-700 italic">"{report.notes}"</p>
          </div>
        )}

        {/* Reporter info */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <span>Reported by</span>
          <span className="font-medium text-slate-900">
            @{report.user?.username || 'Anonymous'}
          </span>
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: trustStars }).map((_, i) => (
              <Star key={i} size={14} fill="currentColor" />
            ))}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={handleUpvote}
            disabled={!user || upvoteMutation.isPending}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
              hasUpvoted 
                ? 'bg-brand-primary text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              !user && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ThumbsUp size={20} fill={hasUpvoted ? 'currentColor' : 'none'} />
            <span>Helpful ({report.upvote_count})</span>
          </button>

          <button
            onClick={handleConfirm}
            disabled={!user || hasConfirmed || confirmMutation.isPending}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
              hasConfirmed 
                ? 'bg-green-500 text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              (!user || hasConfirmed) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <CheckCircle size={20} fill={hasConfirmed ? 'currentColor' : 'none'} />
            <span>Still Accurate ({report.confirmation_count})</span>
          </button>
        </div>

        {/* Plow status estimate */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake size={20} className="text-blue-500" />
            <h3 className="font-semibold">Estimated Plow Status</h3>
          </div>
          {report.condition === 'clear' ? (
            <p className="text-green-600">
              🚜 Likely plowed recently based on this report
            </p>
          ) : report.confirmation_count >= 2 ? (
            <p className="text-amber-600">
              🚜 Multiple reports confirm this condition. Plows may be en route.
            </p>
          ) : (
            <p className="text-slate-600">
              🚜 No official plow data available. Based on this report, the road may not have been plowed recently.
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            This is an estimate based on community reports, not official data.
          </p>
        </div>

        {/* Comments */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Comments ({report.comments?.length || 0})</h3>
          
          {/* Comment form */}
          {user ? (
            <form onSubmit={handleComment} className="flex gap-2 mb-4">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                maxLength={280}
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={!comment.trim() || addCommentMutation.isPending}
                className="btn-primary !px-4"
              >
                {addCommentMutation.isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500 mb-4">
              <Link href="/" className="text-brand-primary hover:underline">
                Sign in
              </Link>{' '}
              to leave a comment.
            </p>
          )}

          {/* Comments list */}
          <div className="space-y-3">
            {report.comments?.map((c) => (
              <div key={c.id} className="bg-slate-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    @{c.user?.username || 'Anonymous'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatTimeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-slate-700">{c.content}</p>
              </div>
            ))}
            
            {(!report.comments || report.comments.length === 0) && (
              <p className="text-slate-500 text-sm">No comments yet.</p>
            )}
          </div>
        </div>

        {/* Flag button */}
        <button
          disabled={!user}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors',
            !user && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Flag size={18} />
          <span>Report this post</span>
        </button>
      </div>
    </div>
  );
}
