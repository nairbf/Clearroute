'use client';

import { useState, useEffect } from 'react';
import { X, Search, MapPin, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn, getConditionColor } from '@/lib/utils';
import type { Report } from '@/types';

interface SearchResultsProps {
  query: string;
  open: boolean;
  onClose: () => void;
  onSelectReport: (report: Report) => void;
}

export function SearchResults({ query, open, onClose, onSelectReport }: SearchResultsProps) {
  const [results, setResults] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (open && query.length >= 2) {
      searchReports(query);
    } else {
      setResults([]);
    }
  }, [query, open]);

  const searchReports = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.reports || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = (report: Report) => {
    onSelectReport(report);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-[60vh] overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <span className="text-sm text-slate-500">
          {loading ? 'Searching...' : `${results.length} results`}
        </span>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Results */}
      <div className="overflow-y-auto max-h-[50vh]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : query.length < 2 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            Type at least 2 characters to search
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center">
            <Search size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No reports found for "{query}"</p>
            <p className="text-sm text-slate-400">Try a different road or location</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map((report) => (
              <button
                key={report.id}
                onClick={() => handleSelectReport(report)}
                className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 text-left transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: getConditionColor(report.condition) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {report.road_name || report.location_name || 'Unknown location'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="capitalize">{report.county} County</span>
                    <span>•</span>
                    <span className="capitalize">{report.condition}</span>
                  </div>
                </div>
                <MapPin size={16} className="text-slate-400 flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}