'use client';

import { useRef, useCallback } from 'react';
import { useReports } from '@/hooks/useReports';
import { useAppStore } from '@/lib/store';
import { ReportCard } from './ReportCard';
import { RefreshCw } from 'lucide-react';

export function FeedView() {
  const { filters } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const { 
    data: reports = [], 
    isLoading, 
    isRefetching,
    refetch 
  } = useReports({
    minutes: filters.minutes,
    county: filters.county !== 'all' ? filters.county : undefined,
    condition: filters.condition !== 'all' ? filters.condition : undefined,
    passability: filters.passability !== 'all' ? filters.passability : undefined,
    limit: 50,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto bg-slate-100"
    >
      {/* Refresh button */}
      <div className="sticky top-0 z-10 bg-slate-100 px-4 py-2 border-b border-slate-200">
        <button
          onClick={handleRefresh}
          disabled={isRefetching}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <RefreshCw 
            size={16} 
            className={isRefetching ? 'animate-spin' : ''} 
          />
          {isRefetching ? 'Refreshing...' : 'Pull to refresh'}
        </button>
      </div>

      {/* Filter summary */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold">{reports.length}</span> reports
          {filters.county !== 'all' && (
            <> in <span className="font-semibold capitalize">{filters.county}</span> County</>
          )}
          {' '}from the last <span className="font-semibold">{filters.minutes}</span> minutes
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-24 skeleton rounded" />
                  <div className="h-4 w-48 skeleton rounded" />
                  <div className="h-4 w-32 skeleton rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="text-6xl mb-4">🛣️</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No reports yet
          </h3>
          <p className="text-slate-600 max-w-xs">
            Be the first to report road conditions in your area! 
            Tap the + button below to add a report.
          </p>
        </div>
      )}

      {/* Reports list */}
      {!isLoading && reports.length > 0 && (
        <div className="p-4 space-y-4 pb-24">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
          
          {/* End of list */}
          <div className="text-center py-4 text-sm text-slate-500">
            You've seen all {reports.length} reports
          </div>
        </div>
      )}
    </div>
  );
}
