'use client';

import { useState } from 'react';
import { 
  X, 
  Loader2, 
  Snowflake, 
  Sun, 
  AlertTriangle, 
  Check,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import type { Report } from '@/types';

interface RoadUpdateSheetProps {
  report: Report;
  open: boolean;
  onClose: () => void;
}

const UPDATE_OPTIONS = [
  {
    type: 'plowed',
    label: 'Plowed / Cleared',
    description: 'Road has been plowed or treated',
    icon: Sun,
    color: 'bg-green-100 text-green-700 border-green-300',
    selectedColor: 'bg-green-500 text-white border-green-500',
  },
  {
    type: 'clearing',
    label: 'Clearing Up',
    description: 'Conditions are improving',
    icon: TrendingUp,
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    selectedColor: 'bg-blue-500 text-white border-blue-500',
  },
  {
    type: 'same',
    label: 'Same as Reported',
    description: 'No change from original report',
    icon: Minus,
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    selectedColor: 'bg-slate-500 text-white border-slate-500',
  },
  {
    type: 'worse',
    label: 'Getting Worse',
    description: 'Conditions have deteriorated',
    icon: TrendingDown,
    color: 'bg-red-100 text-red-700 border-red-300',
    selectedColor: 'bg-red-500 text-white border-red-500',
  },
];

export function RoadUpdateSheet({ report, open, onClose }: RoadUpdateSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedType || !user) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${report.id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_type: selectedType,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit update');
      }

      setSuccess(true);
      
      // Refresh reports
      await queryClient.refetchQueries({ queryKey: ['reports'] });

      // Auto close after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedType(null);
        setNotes('');
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit update');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-2xl p-8 mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Update Submitted!</h2>
          <p className="text-slate-600">Thanks for keeping the community informed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-t-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-lg">Update Road Status</h2>
            <p className="text-sm text-slate-500">{report.road_name || report.location_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-slate-500 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {/* Update options */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">How are conditions now?</p>
            
            {UPDATE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedType === option.type;
              
              return (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    isSelected ? option.selectedColor : option.color
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    isSelected ? 'bg-white/20' : 'bg-white'
                  )}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{option.label}</p>
                    <p className={cn(
                      'text-sm',
                      isSelected ? 'text-white/80' : 'text-slate-500'
                    )}>
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check size={20} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., 'Plow just went by 5 mins ago'"
              rows={2}
              maxLength={200}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none text-sm"
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">💡 How updates work</p>
            <p className="text-blue-600">
              When 3+ people report a road as plowed, the original report will automatically update to "Clear".
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 safe-bottom">
          <button
            onClick={handleSubmit}
            disabled={!selectedType || submitting || !user}
            className={cn(
              'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
              selectedType && user
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : !user ? (
              'Sign in to submit updates'
            ) : (
              'Submit Update'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}