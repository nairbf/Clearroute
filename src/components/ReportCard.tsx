'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  ThumbsUp, 
  CheckCircle, 
  MessageCircle, 
  Flag, 
  MapPin,
  Star,
  Trash2,
  Loader2,
  MoreVertical,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Snowflake,
  Share2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpvote, useConfirm, useHasUpvoted, useHasConfirmed } from '@/hooks/useReports';
import { cn, formatTimeAgo, getConditionColor } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { CommentsSheet } from './CommentsSheet';
import { RoadUpdateSheet } from './RoadUpdateSheet';
import { FlagReportSheet } from './FlagReportSheet';
import { useToast } from '@/components/Toast';
import type { Report, RoadCondition, Passability } from '@/types';

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

interface ReportCardProps {
  report: Report;
  compact?: boolean;
}

export function ReportCard({ report, compact = false }: ReportCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { showToast } = useToast();
  
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showUpdateSheet, setShowUpdateSheet] = useState(false);
  const [showFlagSheet, setShowFlagSheet] = useState(false);

  const { data: hasUpvoted } = useHasUpvoted(report.id);
  const { data: hasConfirmed } = useHasConfirmed(report.id);
  const upvoteMutation = useUpvote();
  const confirmMutation = useConfirm();

  const isOwner = user?.id === report.user_id;

  const handleUpvote = () => {
    if (!user) return;
    upvoteMutation.mutate({ reportId: report.id, remove: hasUpvoted });
  };

  const handleConfirm = () => {
    if (!user || hasConfirmed) return;
    confirmMutation.mutate(report.id);
  };

  const handleDelete = async () => {
    if (!isOwner || !user) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', report.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      setIsDeleted(true);
      setShowDeleteConfirm(false);
      showToast('success', 'Report deleted');

      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['reports'] });
        await queryClient.refetchQueries({ queryKey: ['my-reports'] });
      }, 300);

    } catch (error) {
      console.error('Delete error:', error);
      showToast('error', 'Failed to delete report');
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?report=${report.id}`;
    const text = `Road condition: ${report.road_name || report.location_name} - ${report.condition.toUpperCase()}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: 'ClearRoute Report', 
          text, 
          url 
        });
      } catch (err) {
        // User cancelled - do nothing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        showToast('success', 'Link copied to clipboard!');
      } catch {
        showToast('error', 'Failed to copy link');
      }
    }
  };

  const trustStars = Math.min(3, Math.max(1, Math.ceil((report.user?.trust_score || 0) / 25)));

  if (isDeleted) {
    return null;
  }

  if (compact) {
    return (
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: getConditionColor(report.condition) }}
          >
            {conditionLabels[report.condition]}
          </span>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold',
            report.passability === 'ok' && 'bg-green-100 text-green-800',
            report.passability === 'slow' && 'bg-amber-100 text-amber-800',
            report.passability === 'avoid' && 'bg-red-100 text-red-800',
          )}>
            {passabilityLabels[report.passability]}
          </span>
        </div>
        <p className="font-medium text-sm text-slate-900">
          {report.road_name || report.location_name || 'Unknown location'}
        </p>
        <p className="text-xs text-slate-500">{formatTimeAgo(report.created_at)}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-6">
          <Trash2 size={40} className="text-red-500 mb-3" />
          <h3 className="font-semibold text-lg mb-1">Delete Report?</h3>
          <p className="text-slate-600 text-sm text-center mb-4">
            This action cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 py-2 px-4 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Photo */}
      {report.photo_urls && report.photo_urls.length > 0 && (
        <div className="relative h-48 bg-slate-200">
          <Image
            src={report.photo_urls[0]}
            alt="Road condition"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-semibold text-white uppercase"
              style={{ backgroundColor: getConditionColor(report.condition) }}
            >
              {conditionLabels[report.condition]}
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold uppercase',
              report.passability === 'ok' && 'bg-green-100 text-green-800',
              report.passability === 'slow' && 'bg-amber-100 text-amber-800',
              report.passability === 'avoid' && 'bg-red-100 text-red-800',
            )}>
              {passabilityLabels[report.passability]}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">
              {formatTimeAgo(report.created_at)}
            </span>
            
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <MoreVertical size={16} />
                </button>
                
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowMenu(false)} 
                    />
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete Report
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-slate-900 mb-1">
          <MapPin size={14} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium truncate">
            {report.road_name || report.location_name || 'Unknown location'}
          </span>
        </div>

        {/* County */}
        <p className="text-sm text-slate-500 capitalize mb-2">
          {report.county} County
        </p>

        {/* Notes */}
        {report.notes && (
          <p className="text-slate-700 text-sm mb-3 bg-slate-50 p-2 rounded">
            "{report.notes}"
          </p>
        )}

        {/* Reporter */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <span>Reported by</span>
          <span className="font-medium text-slate-700">
            @{report.user?.username || 'Anonymous'}
            {isOwner && <span className="text-blue-600 ml-1">(you)</span>}
          </span>
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: trustStars }).map((_, i) => (
              <Star key={i} size={12} fill="currentColor" />
            ))}
          </span>
        </div>

        {/* Latest update status */}
        {report.latest_update && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm',
            report.latest_update === 'plowed' && 'bg-green-100 text-green-800',
            report.latest_update === 'clearing' && 'bg-blue-100 text-blue-800',
            report.latest_update === 'same' && 'bg-slate-100 text-slate-800',
            report.latest_update === 'worse' && 'bg-red-100 text-red-800',
          )}>
            {report.latest_update === 'plowed' && <Snowflake size={16} />}
            {report.latest_update === 'clearing' && <TrendingUp size={16} />}
            {report.latest_update === 'same' && <Minus size={16} />}
            {report.latest_update === 'worse' && <TrendingDown size={16} />}
            <span className="font-medium">
              {report.latest_update === 'plowed' && 'Marked as Plowed'}
              {report.latest_update === 'clearing' && 'Conditions Improving'}
              {report.latest_update === 'same' && 'No Change'}
              {report.latest_update === 'worse' && 'Getting Worse'}
            </span>
            {report.plowed_count && report.plowed_count > 0 && report.latest_update === 'plowed' && (
              <span className="ml-auto text-xs">
                {report.plowed_count} {report.plowed_count === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
          <button
            onClick={handleUpvote}
            disabled={!user || upvoteMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              hasUpvoted 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-100',
              !user && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ThumbsUp size={16} fill={hasUpvoted ? 'currentColor' : 'none'} />
            <span>{report.upvote_count}</span>
          </button>

          <button
            onClick={() => setShowUpdateSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            title="Update road status"
          >
            <RefreshCw size={16} />
            <span>Update</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            title="Share report"
          >
            <Share2 size={16} />
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <MessageCircle size={16} />
            <span>{report.comment_count}</span>
          </button>

          <button
            onClick={() => setShowFlagSheet(true)}
            disabled={!user || isOwner}
            className={cn(
              'ml-auto p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors',
              (!user || isOwner) && 'opacity-50 cursor-not-allowed'
            )}
            title={isOwner ? "You can't flag your own report" : 'Report this post'}
          >
            <Flag size={16} />
          </button>
        </div>
      </div>

      {/* Comments sheet */}
      <CommentsSheet
        report={report}
        open={showComments}
        onClose={() => setShowComments(false)}
      />

      {/* Road update sheet */}
      <RoadUpdateSheet
        report={report}
        open={showUpdateSheet}
        onClose={() => setShowUpdateSheet(false)}
      />

      {/* Flag report sheet */}
      <FlagReportSheet
        report={report}
        open={showFlagSheet}
        onClose={() => setShowFlagSheet(false)}
      />
    </div>
  );
}