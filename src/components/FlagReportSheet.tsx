'use client';

import { useState } from 'react';
import { X, Flag, Loader2, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Report } from '@/types';

interface FlagReportSheetProps {
  report: Report;
  open: boolean;
  onClose: () => void;
}

const FLAG_REASONS = [
  { value: 'inaccurate', label: 'Inaccurate Information', description: 'The road conditions described are wrong' },
  { value: 'outdated', label: 'Outdated', description: 'This report is no longer relevant' },
  { value: 'spam', label: 'Spam', description: 'This is spam or advertising' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Contains offensive or inappropriate content' },
  { value: 'wrong_location', label: 'Wrong Location', description: 'The location is incorrect' },
  { value: 'other', label: 'Other', description: 'Another reason not listed' },
];

export function FlagReportSheet({ report, open, onClose }: FlagReportSheetProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedReason || !user) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${report.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit flag');
      }

      setSuccess(true);

      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedReason(null);
        setDetails('');
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit flag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedReason(null);
    setDetails('');
    setError(null);
    setSuccess(false);
  };

  if (!open) return null;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-2xl p-8 mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Report Flagged</h2>
          <p className="text-slate-600">Thanks for helping keep our community safe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-t-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <Flag size={20} />
            <h2 className="font-semibold text-lg">Flag Report</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 -m-2 text-slate-500 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          <p className="text-sm text-slate-600">
            Why are you flagging this report? This will be reviewed by our moderators.
          </p>

          {/* Reason options */}
          <div className="space-y-2">
            {FLAG_REASONS.map((reason) => (
              <button
                key={reason.value}
                onClick={() => setSelectedReason(reason.value)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                  selectedReason === reason.value
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  selectedReason === reason.value
                    ? 'border-red-500 bg-red-500'
                    : 'border-slate-300'
                )}>
                  {selectedReason === reason.value && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{reason.label}</p>
                  <p className="text-sm text-slate-500">{reason.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Additional details */}
          {selectedReason && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional details <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide more context..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none resize-none text-sm"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 safe-bottom">
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting || !user}
            className={cn(
              'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
              selectedReason && user
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag size={20} />
                Submit Flag
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}