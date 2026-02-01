import { create } from 'zustand';
import type { FilterState, MapViewport, Report, Profile } from '@/types';

const CNY_CENTER = {
  lat: 43.0481,
  lng: -76.1474,
};

interface AppState {
  // Auth
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  
  // Map viewport
  viewport: MapViewport;
  setViewport: (viewport: Partial<MapViewport>) => void;
  
  // Filters
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  
  // Selected report
  selectedReport: Report | null;
  setSelectedReport: (report: Report | null) => void;
  
  // UI state
  isPostModalOpen: boolean;
  setPostModalOpen: (open: boolean) => void;
  activeView: 'map' | 'feed';
  setActiveView: (view: 'map' | 'feed') => void;
}

const defaultFilters: FilterState = {
  minutes: 60,
  county: 'all',
  condition: 'all',
  passability: 'all',
};

const defaultViewport: MapViewport = {
  latitude: CNY_CENTER.lat,
  longitude: CNY_CENTER.lng,
  zoom: 9,
};

export const useAppStore = create<AppState>()((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),
  
  // Map viewport
  viewport: defaultViewport,
  setViewport: (newViewport) => set((state) => ({ 
    viewport: { ...state.viewport, ...newViewport } 
  })),
  
  // Filters
  filters: defaultFilters,
  setFilters: (newFilters) => set((state) => ({ 
    filters: { ...state.filters, ...newFilters } 
  })),
  resetFilters: () => set({ filters: defaultFilters }),
  
  // Selected report
  selectedReport: null,
  setSelectedReport: (report) => set({ selectedReport: report }),
  
  // UI state
  isPostModalOpen: false,
  setPostModalOpen: (open) => set({ isPostModalOpen: open }),
  activeView: 'map',
  setActiveView: (view) => set({ activeView: view }),
}));