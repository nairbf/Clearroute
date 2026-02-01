'use client';

import { Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { PostModal } from './PostModal';
import { useState } from 'react';

export function BottomNav() {
  const { isPostModalOpen, setPostModalOpen } = useAppStore();
  const { user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handlePostClick = () => {
    if (!user) {
      setShowAuthPrompt(true);
      setTimeout(() => setShowAuthPrompt(false), 3000);
      return;
    }
    setPostModalOpen(true);
  };

  return (
    <>
      {/* Auth prompt toast */}
      {showAuthPrompt && (
        <div className="fixed bottom-24 left-4 right-4 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 text-center animate-fade-in">
          Please sign in to submit a report
        </div>
      )}

      {/* Floating action button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handlePostClick}
          className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      {/* Post modal */}
      <PostModal 
        open={isPostModalOpen} 
        onClose={() => setPostModalOpen(false)} 
      />
    </>
  );
}