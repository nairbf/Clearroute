'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, User, LogOut, Shield, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { FilterSheet } from './FilterSheet';
import { AuthModal } from './AuthModal';
import { SearchResults } from './SearchResults';
import Link from 'next/link';
import type { Report } from '@/types';

export function Header() {
  const [showFilters, setShowFilters] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user, profile, signOut } = useAuth();
  const { filters, setSelectedReport, setViewport } = useAppStore();

  // Count active filters
  const activeFilterCount = [
    filters.county !== 'all',
    filters.condition !== 'all',
    filters.passability !== 'all',
    filters.minutes !== 60,
  ].filter(Boolean).length;

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setTimeout(() => setShowSearch(false), 200);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      setShowSearch(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length >= 2) {
      setShowSearch(true);
    }
  };

  const handleSelectReport = (report: Report) => {
    setSelectedReport(report);
    if (report.location) {
      setViewport({
        latitude: report.location.lat,
        longitude: report.location.lng,
        zoom: 15,
      });
    }
    setSearchQuery('');
    setShowSearch(false);
    
    // Scroll to the report
    setTimeout(() => {
      const element = document.getElementById(`report-${report.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearch(false);
    searchInputRef.current?.focus();
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  return (
    <>
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white safe-top shadow-lg">
        <div className="px-4 py-3">
          {/* Top row: Logo and user */}
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">🚗</span>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">ClearRoute</h1>
                <p className="text-[10px] text-blue-200 leading-tight">CNY Road Conditions</p>
              </div>
            </Link>
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <span className="text-sm font-medium">@{profile?.username || 'User'}</span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={16} />
                  </div>
                </button>
                
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)} 
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-20">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={16} />
                        <span>My Profile</span>
                      </Link>
                      
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield size={16} />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
          
          {/* Search and filter row */}
          <div className="flex gap-2 relative" ref={searchInputRef}>
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" 
                size={18} 
              />
              <input
                type="text"
                placeholder="Search road or town..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}
            </form>
            
            <button
              onClick={() => setShowFilters(true)}
              className="relative flex items-center gap-1 px-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search Results Dropdown */}
            <SearchResults
              query={searchQuery}
              open={showSearch}
              onClose={() => setShowSearch(false)}
              onSelectReport={handleSelectReport}
            />
          </div>
        </div>
      </header>

      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}