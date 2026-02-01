'use client';

import { Map, List, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { PostModal } from './PostModal';

export function BottomNav() {
  const { activeView, setActiveView, isPostModalOpen, setPostModalOpen } = useAppStore();
  const { user } = useAuth();

  const handlePostClick = () => {
    if (!user) {
      // TODO: Show auth modal instead
      alert('Please sign in to post a report');
      return;
    }
    setPostModalOpen(true);
  };

  return (
    <>
      <nav className="bg-white border-t border-slate-200 safe-bottom">
        <div className="flex items-center justify-around px-4 py-2">
          {/* Map tab */}
          <button
            onClick={() => setActiveView('map')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors',
              activeView === 'map' 
                ? 'text-brand-primary' 
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Map size={24} />
            <span className="text-xs font-medium">Map</span>
          </button>

          {/* Post button */}
          <button
            onClick={handlePostClick}
            className="relative -mt-6 w-16 h-16 rounded-full bg-brand-primary text-white shadow-lg flex items-center justify-center hover:bg-blue-900 active:scale-95 transition-all"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>

          {/* Feed tab */}
          <button
            onClick={() => setActiveView('feed')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors',
              activeView === 'feed' 
                ? 'text-brand-primary' 
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <List size={24} />
            <span className="text-xs font-medium">Feed</span>
          </button>
        </div>
      </nav>

      {/* Post modal */}
      <PostModal 
        open={isPostModalOpen} 
        onClose={() => setPostModalOpen(false)} 
      />
    </>
  );
}
