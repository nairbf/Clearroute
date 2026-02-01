'use client';

import { useState } from 'react';
import { Search, Filter, User, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { FilterSheet } from './FilterSheet';
import { AuthModal } from './AuthModal';
import Link from 'next/link';

export function Header() {
  const [showFilters, setShowFilters] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile, loading } = useAuth();
  const { filters } = useAppStore();

  // Count active filters
  const activeFilterCount = [
    filters.county !== 'all',
    filters.condition !== 'all',
    filters.passability !== 'all',
    filters.minutes !== 60,
  ].filter(Boolean).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement geocoding search
    console.log('Search:', searchQuery);
  };

  return (
    <>
      <header className="bg-brand-primary text-white safe-top">
        <div className="px-4 py-3">
          {/* Top row: Logo and user */}
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🚜</span>
              <h1 className="font-display font-bold text-lg">CNY Plow Report</h1>
            </Link>
            
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
            ) : user ? (
              <Link 
                href="/profile" 
                className="flex items-center gap-2 touch-target"
              >
                <span className="text-sm opacity-80">@{profile?.username || 'User'}</span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User size={18} />
                </div>
              </Link>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="btn-ghost !text-white !bg-white/10 hover:!bg-white/20"
              >
                Sign In
              </button>
            )}
          </div>
          
          {/* Search and filter row */}
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" 
                size={18} 
              />
              <input
                type="text"
                placeholder="Search road or town..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 outline-none"
              />
            </form>
            
            <button
              onClick={() => setShowFilters(true)}
              className="relative touch-target px-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Filter size={20} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-accent text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Filter sheet */}
      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} />
      
      {/* Auth modal */}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
