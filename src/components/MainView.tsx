'use client';

import { useAppStore } from '@/lib/store';
import { MapView } from './MapView';
import { FeedView } from './FeedView';

export function MainView() {
  const { activeView } = useAppStore();

  return (
    <div className="h-full">
      {activeView === 'map' ? <MapView /> : <FeedView />}
    </div>
  );
}