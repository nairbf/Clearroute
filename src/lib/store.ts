import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterState, MapViewport, Report, Profile } from '@/types';

const CNY_CENTER = {
  lat: 43.0481,
  lng: -76.1474,
};

interface AppState {
  // User location
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  hasSetLocation: boolean;
  setHasSetLocation: (value: boolean) => void;
  
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
  
  // Show expired
  showExpired: boolean;
  setShowExpired: (value: boolean) => void;
  
  // Selected report
  selectedReport: Report | null;
  setSelectedReport: (report: Report | null) => void;
  
  // UI state
  isPostModalOpen: boolean;
  setPostModalOpen: (open: boolean) => void;
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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User location
      userLocation: null,
      setUserLocation: (location) => set({ userLocation: location, hasSetLocation: true }),
      hasSetLocation: false,
      setHasSetLocation: (value) => set({ hasSetLocation: value }),
      
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
      
      // Show expired
      showExpired: false,
      setShowExpired: (value) => set({ showExpired: value }),
      
      // Selected report
      selectedReport: null,
      setSelectedReport: (report) => set({ selectedReport: report }),
      
      // UI state
      isPostModalOpen: false,
      setPostModalOpen: (open) => set({ isPostModalOpen: open }),
    }),
    {
      name: 'clearroute-storage',
      partialize: (state) => ({ 
        userLocation: state.userLocation,
        hasSetLocation: state.hasSetLocation,
      }),
    }
  )
);