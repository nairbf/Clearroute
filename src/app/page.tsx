'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { MainView } from '@/components/MainView';
import { BottomNav } from '@/components/BottomNav';
import { LocationPrompt } from '@/components/LocationPrompt';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const { hasSetLocation } = useAppStore();
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!hasSetLocation) {
      setShowLocationPrompt(true);
    }
  }, [hasSetLocation]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (showLocationPrompt && !hasSetLocation) {
    return (
      <LocationPrompt 
        onLocationSet={() => setShowLocationPrompt(false)} 
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <Header />
      <main className="flex-1 overflow-hidden">
        <MainView />
      </main>
      <BottomNav />
    </div>
  );
}