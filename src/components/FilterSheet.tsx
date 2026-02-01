'use client';

import { X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { CONDITIONS, PASSABILITIES, COUNTIES, TIME_FILTERS } from '@/types';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
}

export function FilterSheet({ open, onClose }: FilterSheetProps) {
  const { filters, setFilters, resetFilters } = useAppStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md max-h-[80vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="text-sm text-brand-primary font-medium"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-slate-500 hover:text-slate-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Time filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Time Range
            </label>
            <div className="flex gap-2">
              {TIME_FILTERS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFilters({ minutes: t.value })}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                    filters.minutes === t.value
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* County filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              County
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFilters({ county: 'all' })}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                  filters.county === 'all'
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                )}
              >
                All
              </button>
              {COUNTIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilters({ county: c.value })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                    filters.county === c.value
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Road Condition
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setFilters({ condition: 'all' })}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                  filters.condition === 'all'
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                )}
              >
                All
              </button>
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilters({ condition: c.value })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                    filters.condition === c.value
                      ? 'border-2'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                  style={filters.condition === c.value ? {
                    borderColor: c.color,
                    backgroundColor: `${c.color}20`,
                  } : {}}
                >
                  {c.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Passability filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Passability
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setFilters({ passability: 'all' })}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                  filters.passability === 'all'
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                )}
              >
                All
              </button>
              {PASSABILITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setFilters({ passability: p.value })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                    filters.passability === p.value
                      ? 'border-2'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                  style={filters.passability === p.value ? {
                    borderColor: p.color,
                    backgroundColor: `${p.color}20`,
                  } : {}}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 safe-bottom">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
