'use client';

import { useState, useEffect } from 'react';
import { MapPin, Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CNY_CENTER } from '@/types';

interface LocationPromptProps {
  onLocationSet: () => void;
}

export function LocationPrompt({ onLocationSet }: LocationPromptProps) {
  const { setUserLocation } = useAppStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser');
      setStatus('error');
      return;
    }

    setStatus('loading');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        onLocationSet();
      },
      (error) => {
        console.error('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage('Location permission denied. Please enable it in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Location information unavailable.');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out.');
            break;
          default:
            setErrorMessage('An unknown error occurred.');
        }
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const useDefaultLocation = () => {
    setUserLocation(CNY_CENTER);
    onLocationSet();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-blue-800 to-blue-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
        <MapPin size={40} />
      </div>
      
      <h1 className="text-2xl font-bold mb-2 text-center">Welcome to ClearRoute</h1>
      <p className="text-blue-200 text-center mb-8 max-w-xs">
        Share your location to see road conditions near you
      </p>

      {status === 'error' && (
        <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mb-6 max-w-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={requestLocation}
          disabled={status === 'loading'}
          className="w-full py-4 bg-white text-blue-800 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors disabled:opacity-70"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <Navigation size={20} />
              Use My Location
            </>
          )}
        </button>

        <button
          onClick={useDefaultLocation}
          className="w-full py-4 bg-white/10 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
        >
          <MapPin size={20} />
          Use Syracuse Area
        </button>
      </div>

      <p className="text-blue-300 text-xs mt-8 text-center max-w-xs">
        Your location is only used to show nearby reports and is never stored on our servers.
      </p>
    </div>
  );
}