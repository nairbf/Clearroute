'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { 
  Marker, 
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Loader2, Check, Navigation, Crosshair } from 'lucide-react';
import { getLocationDetails, mapCountyName } from '@/lib/geocoding';
import { getMapStyle, MAPLIBRE_FALLBACK_STYLE } from '@/lib/mapStyles';
import type { County } from '@/types';

interface LocationPickerProps {
  initialLocation: { lat: number; lng: number } | null;
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    roadName: string | null;
    locationDisplay: string;
    county: County | null;
  }) => void;
  onClose: () => void;
}

export function LocationPicker({ initialLocation, onLocationSelect, onClose }: LocationPickerProps) {
  const mapRef = useRef<MapRef>(null);
  const [markerPosition, setMarkerPosition] = useState(initialLocation || { lat: 43.0481, lng: -76.1474 });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationInfo, setLocationInfo] = useState<{
    road: string | null;
    display: string;
    county: string | null;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mapStyle, setMapStyle] = useState(() => getMapStyle('osm_bright'));

  // Geocode a location
  const geocodeLocation = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const details = await getLocationDetails(lat, lng);
      setLocationInfo({
        road: details.road,
        display: details.displayName,
        county: details.county,
      });
    } catch (error) {
      setLocationInfo({
        road: null,
        display: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        county: null,
      });
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Geocode initial position on mount
  useEffect(() => {
    if (initialLocation) {
      geocodeLocation(initialLocation.lat, initialLocation.lng);
    }
  }, []);

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat;
    setMarkerPosition({ lat, lng });
    geocodeLocation(lat, lng);
  }, [geocodeLocation]);

  const handleMarkerDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMarkerDrag = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    const { lng, lat } = e.lngLat;
    setMarkerPosition({ lat, lng });
  }, []);

  const handleMarkerDragEnd = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    const { lng, lat } = e.lngLat;
    setIsDragging(false);
    setMarkerPosition({ lat, lng });
    geocodeLocation(lat, lng);
  }, [geocodeLocation]);

  const handleConfirm = () => {
    // Always include coordinates in the location display
    let displayName = '';
    
    if (locationInfo?.road) {
      // "Road Name (lat, lng)"
      displayName = `${locationInfo.road} (${markerPosition.lat.toFixed(4)}, ${markerPosition.lng.toFixed(4)})`;
    } else if (locationInfo?.display && !locationInfo.display.match(/^[\d.-]+,\s*[\d.-]+$/)) {
      // "Location Name (lat, lng)"
      displayName = `${locationInfo.display} (${markerPosition.lat.toFixed(4)}, ${markerPosition.lng.toFixed(4)})`;
    } else {
      // Just coordinates
      displayName = `${markerPosition.lat.toFixed(4)}, ${markerPosition.lng.toFixed(4)}`;
    }

    console.log('LocationPicker confirm:', { 
      lat: markerPosition.lat, 
      lng: markerPosition.lng, 
      displayName,
      road: locationInfo?.road 
    });

    onLocationSelect({
      lat: markerPosition.lat,
      lng: markerPosition.lng,
      roadName: locationInfo?.road || null,
      locationDisplay: displayName,
      county: mapCountyName(locationInfo?.county) as County | null,
    });
  };

  const handleRecenter = () => {
    if (initialLocation) {
      mapRef.current?.flyTo({ 
        center: [initialLocation.lng, initialLocation.lat], 
        zoom: 16,
        duration: 1000
      });
      setMarkerPosition(initialLocation);
      geocodeLocation(initialLocation.lat, initialLocation.lng);
    }
  };

  const circleGeoJSON = {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [markerPosition.lng, markerPosition.lat],
    },
    properties: {},
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 safe-top shadow-lg">
        <h2 className="font-semibold text-lg">Select Road Location</h2>
        <p className="text-sm text-blue-100">Drag the pin to the road you want to report</p>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: markerPosition.lat,
            longitude: markerPosition.lng,
            zoom: 16,
          }}
          onError={() => setMapStyle(MAPLIBRE_FALLBACK_STYLE)}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
        >
          <NavigationControl position="top-right" />
          <GeolocateControl 
            position="top-right" 
            trackUserLocation
            onGeolocate={(e) => {
              const { latitude, longitude } = e.coords;
              setMarkerPosition({ lat: latitude, lng: longitude });
              mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
              geocodeLocation(latitude, longitude);
            }}
          />

          {/* Pulsing circle around marker */}
          <Source id="marker-circle" type="geojson" data={circleGeoJSON}>
            <Layer
              id="marker-circle-pulse"
              type="circle"
              paint={{
                'circle-radius': isDragging ? 40 : 30,
                'circle-color': 'rgba(37, 99, 235, 0.15)',
                'circle-stroke-color': 'rgba(37, 99, 235, 0.5)',
                'circle-stroke-width': 2,
              }}
            />
          </Source>

          {/* Draggable marker */}
          <Marker
            latitude={markerPosition.lat}
            longitude={markerPosition.lng}
            anchor="bottom"
            draggable
            onDragStart={handleMarkerDragStart}
            onDrag={handleMarkerDrag}
            onDragEnd={handleMarkerDragEnd}
          >
            <div className={`transition-transform ${isDragging ? 'scale-125' : 'scale-100'}`}>
              <div className="relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full blur-sm" />
                <MapPin 
                  size={44} 
                  className="text-blue-600 drop-shadow-lg" 
                  fill="#2563eb"
                  strokeWidth={1.5}
                />
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full border-2 border-blue-700" />
              </div>
            </div>
          </Marker>
        </Map>

        {/* Location info card */}
        <div className="absolute top-4 left-4 right-4 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                locationInfo?.road ? 'bg-green-100' : 'bg-slate-100'
              }`}>
                {isGeocoding ? (
                  <Loader2 size={20} className="text-blue-600 animate-spin" />
                ) : locationInfo?.road ? (
                  <Check size={20} className="text-green-600" />
                ) : (
                  <Crosshair size={20} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isGeocoding ? (
                  <div>
                    <p className="font-medium text-slate-500">Finding road...</p>
                    <p className="text-sm text-slate-400">Move pin to update</p>
                  </div>
                ) : locationInfo?.road ? (
                  <div>
                    <p className="font-semibold text-slate-900 truncate">{locationInfo.road}</p>
                    <p className="text-sm text-slate-500 truncate">
                      {markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-amber-600">No road detected</p>
                    <p className="text-sm text-slate-500">Drag the pin onto a road</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className={`h-1 transition-colors ${
            isGeocoding ? 'bg-blue-400 animate-pulse' : 
            locationInfo?.road ? 'bg-green-500' : 'bg-amber-400'
          }`} />
        </div>

        {/* Recenter button */}
        {initialLocation && (
          <button
            onClick={handleRecenter}
            className="absolute bottom-4 left-4 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Navigation size={16} className="text-blue-600" />
            My Location
          </button>
        )}

        {/* Instruction hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
          Tap map or drag pin to select road
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bg-white border-t border-slate-200 p-4 safe-bottom">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isGeocoding}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
              locationInfo?.road 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isGeocoding ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Check size={20} />
                {locationInfo?.road ? `Select ${locationInfo.road}` : 'Confirm Location'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
