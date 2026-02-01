'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ThumbsUp, 
  CheckCircle, 
  MessageCircle, 
  Flag, 
  MapPin,
  Clock,
  Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpvote, useConfirm, useHasUpvoted, useHasConfirmed } from '@/hooks/useReports';
import { cn, formatTimeAgo, getConditionColor } from '@/lib/utils';
import type { Report, RoadCondition, Passability } from '@/types';

interface ReportCardProps {
  report: Report;
  compact?: boolean;
}

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

export function ReportCard({ report, compact = false }: ReportCardProps) {
  const { user } = useAuth();
  const [showFlagModal, setShowFlagModal] = useState(false);
  
  const upvoteMutation = useUpvote();
  const confirmMutation = useConfirm();
  const { data: hasUpvoted } = useHasUpvoted(report.id);
  const { data: hasConfirmed } = useHasConfirmed(report.id);

  const handleUpvote = () => {
    if (!user) return;
    upvoteMutation.mutate({ 
      reportId: report.id, 
      remove: hasUpvoted 
    });
  };

  const handleConfirm = () => {
    if (!user || hasConfirmed) return;
    confirmMutation.mutate(report.id);
  };

  // Trust level stars (1-3)
  const trustStars = Math.min(3, Math.max(1, Math.ceil((report.user?.trust_score || 0) / 20)));

  if (compact) {
    // Compact version for map popup
    return (
      <div className="p-1">
        {/* Condition badge */}
        <div className="flex items-center gap-2 mb-2">
          <span 
            className={cn('badge', `badge-${report.condition}`)}
          >
            {conditionLabels[report.condition]}
          </span>
          <span className={cn('badge', `badge-${report.passability}`)}>
            {passabilityLabels[report.passability]}
          </span>
        </div>

        {/* Location */}
        <p className="font-medium text-sm text-slate-900 mb-1">
          {report.location_name || report.road_name || 'Unknown location'}
        </p>

        {/* Time */}
        <p className="text-xs text-slate-500 mb-2">
          {formatTimeAgo(report.created_at)}
        </p>

        {/* Notes preview */}
        {report.notes && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
            "{report.notes}"
          </p>
        )}

        {/* Link to full report */}
        <Link 
          href={`/report/${report.id}`}
          className="text-sm text-brand-primary font-medium hover:underline"
        >
          View details →
        </Link>
      </div>
    );
  }

  // Full card version for feed
  return (
    <div className="card overflow-hidden">
      {/* Photo (if exists) */}
      {report.photo_urls.length > 0 && (
        <div className="relative h-48 bg-slate-200">
          <Image
            src={report.photo_urls[0]}
            alt="Road condition"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          {report.photo_urls.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              +{report.photo_urls.length - 1} more
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className={cn('badge', `badge-${report.condition}`)}
            >
              {conditionLabels[report.condition]}
            </span>
            <span className={cn('badge', `badge-${report.passability}`)}>
              {passabilityLabels[report.passability]}
            </span>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatTimeAgo(report.created_at)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-slate-900 mb-1">
          <MapPin size={14} className="text-slate-400" />
          <span className="font-medium">
            {report.location_name || report.road_name || 'Unknown location'}
          </span>
        </div>

        {/* County */}
        <p className="text-sm text-slate-500 mb-3 capitalize">
          {report.county} County
        </p>

        {/* Notes */}
        {report.notes && (
          <p className="text-slate-700 mb-3">
            "{report.notes}"
          </p>
        )}

        {/* Reporter info */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <span>Reported by</span>
          <span className="font-medium text-slate-700">
            @{report.user?.username || 'Anonymous'}
          </span>
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: trustStars }).map((_, i) => (
              <Star key={i} size={12} fill="currentColor" />
            ))}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
          {/* Upvote */}
          <button
            onClick={handleUpvote}
            disabled={!user || upvoteMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              hasUpvoted 
                ? 'bg-brand-primary/10 text-brand-primary' 
                : 'text-slate-600 hover:bg-slate-100',
              !user && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ThumbsUp size={16} fill={hasUpvoted ? 'currentColor' : 'none'} />
            <span>{report.upvote_count}</span>
          </button>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={!user || hasConfirmed || confirmMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              hasConfirmed 
                ? 'bg-green-100 text-green-700' 
                : 'text-slate-600 hover:bg-slate-100',
              (!user || hasConfirmed) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <CheckCircle size={16} fill={hasConfirmed ? 'currentColor' : 'none'} />
            <span>{report.confirmation_count}</span>
          </button>

          {/* Comments */}
          <Link
            href={`/report/${report.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <MessageCircle size={16} />
            <span>{report.comment_count}</span>
          </Link>

          {/* Flag */}
          <button
            onClick={() => user && setShowFlagModal(true)}
            disabled={!user}
            className={cn(
              'ml-auto p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors',
              !user && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Flag size={16} />
          </button>
        </div>
      </div>

      {/* TODO: Flag modal */}
    </div>
  );
}
