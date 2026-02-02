'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import Map, { 
  Marker, 
  Popup, 
  NavigationControl, 
  GeolocateControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import useSupercluster from 'use-supercluster';
import { useAppStore } from '@/lib/store';
import { useReports } from '@/hooks/useReports';
import { ReportCard } from './ReportCard';
import { getConditionColor } from '@/lib/utils';
import { Maximize2, Minimize2, MapPin, Clock, History } from 'lucide-react';
import type { Report } from '@/types';

const MAP_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';

const CNY_CENTER = { lat: 43.0481, lng: -76.1474 };
const CNY_BOUNDS: [[number, number], [number, number]] = [
  [-77.5, 42.0],
  [-74.5, 44.5],
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function MainView() {
  const mapRef = useRef<MapRef>(null);
  const { filters, selectedReport, setSelectedReport, userLocation } = useAppStore();
  const [mapExpanded, setMapExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'older'>('recent');
  
  const initialLat = userLocation?.lat ?? CNY_CENTER.lat;
  const initialLng = userLocation?.lng ?? CNY_CENTER.lng;
  
  const [viewState, setViewState] = useState({
    latitude: initialLat,
    longitude: initialLng,
    zoom: userLocation ? 11 : 9,
  });
  const [bounds, setBounds] = useState<[number, number, number, number]>([-77.5, 42.0, -74.5, 44.5]);

  // Fetch recent reports (last 12 hours)
  const { data: recentReports = [], isLoading: loadingRecent } = useReports({
    section: 'recent',
    county: filters.county !== 'all' ? filters.county : undefined,
    condition: filters.condition !== 'all' ? filters.condition : undefined,
    passability: filters.passability !== 'all' ? filters.passability : undefined,
  });

  // Fetch older reports (12-48 hours ago)
  const { data: olderReports = [], isLoading: loadingOlder } = useReports({
    section: 'older',
    county: filters.county !== 'all' ? filters.county : undefined,
    condition: filters.condition !== 'all' ? filters.condition : undefined,
    passability: filters.passability !== 'all' ? filters.passability : undefined,
  });

  const currentReports = activeTab === 'recent' ? recentReports : olderReports;
  const isLoading = activeTab === 'recent' ? loadingRecent : loadingOlder;

  // Sort by distance if user location available
  const sortedReports = useMemo(() => {
    const validReports = currentReports.filter(r => 
      r.location && 
      typeof r.location.lat === 'number' && 
      typeof r.location.lng === 'number' &&
      r.location.lat !== 0 &&
      r.location.lng !== 0
    );

    if (userLocation) {
      return validReports
        .map(report => ({
          ...report,
          distance: getDistance(
            userLocation.lat,
            userLocation.lng,
            report.location!.lat,
            report.location!.lng
          )
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    return validReports;
  }, [currentReports, userLocation]);

  // Map always shows recent reports
  const mapReports = useMemo(() => {
    return recentReports.filter(r => 
      r.location && 
      typeof r.location.lat === 'number' && 
      typeof r.location.lng === 'number' &&
      r.location.lat !== 0 &&
      r.location.lng !== 0
    );
  }, [recentReports]);

  const points = useMemo(() => 
    mapReports.map((report) => ({
      type: 'Feature' as const,
      properties: { 
        cluster: false,
        reportId: report.id,
        report: report,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [report.location!.lng, report.location!.lat],
      },
    })), [mapReports]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: viewState.zoom,
    options: { 
      radius: 60, 
      maxZoom: 16,
      minPoints: 2,
    },
  });

  const updateBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      const b = map.getBounds();
      setBounds([
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ]);
    }
  }, []);

  const handleClusterClick = useCallback((clusterId: number, lat: number, lng: number) => {
    if (!supercluster) return;
    const zoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 16);
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 });
  }, [supercluster]);

  const handleMarkerClick = (report: Report) => {
    setSelectedReport(report);
    setActiveTab('recent');
    setTimeout(() => {
      const element = document.getElementById(`report-${report.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const formatDistance = (miles: number): string => {
    if (miles < 0.1) return 'Nearby';
    if (miles < 1) return `${(miles * 5280 / 1000).toFixed(1)}k ft`;
    return `${miles.toFixed(1)} mi`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Map Section */}
      <div className={`relative transition-all duration-300 flex-shrink-0 ${mapExpanded ? 'h-[60vh]' : 'h-48'}`}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onMoveEnd={updateBounds}
          onLoad={updateBounds}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          maxBounds={CNY_BOUNDS}
          minZoom={7}
          maxZoom={18}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <GeolocateControl position="top-right" trackUserLocation />

          {userLocation && (
            <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
            </Marker>
          )}

          {clusters.map((cluster) => {
            const [lng, lat] = cluster.geometry.coordinates;
            const { cluster: isCluster, point_count: pointCount } = cluster.properties;

            if (isCluster) {
              const size = Math.min(45, Math.max(28, 28 + (pointCount / points.length) * 25));
              return (
                <Marker key={`cluster-${cluster.id}`} latitude={lat} longitude={lng} anchor="center">
                  <div
                    onClick={() => handleClusterClick(cluster.id as number, lat, lng)}
                    className="rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform bg-blue-600"
                    style={{ width: `${size}px`, height: `${size}px` }}
                  >
                    <span className="text-white font-bold text-xs">{pointCount}</span>
                  </div>
                </Marker>
              );
            }

            const report = cluster.properties.report as Report;
            const isSelected = selectedReport?.id === report.id;

            return (
              <Marker
                key={`report-${report.id}`}
                latitude={lat}
                longitude={lng}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleMarkerClick(report);
                }}
              >
                <div
                  className={`w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs cursor-pointer transition-transform ${
                    isSelected ? 'scale-125 ring-2 ring-blue-400' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: getConditionColor(report.condition) }}
                >
                  {report.condition === 'ice' || report.condition === 'whiteout' ? '!' : report.condition[0].toUpperCase()}
                </div>
              </Marker>
            );
          })}

          {selectedReport && selectedReport.location && mapExpanded && (
            <Popup
              latitude={selectedReport.location.lat}
              longitude={selectedReport.location.lng}
              anchor="bottom"
              onClose={() => setSelectedReport(null)}
              closeButton={true}
              closeOnClick={false}
              maxWidth="280px"
              offset={15}
            >
              <ReportCard report={selectedReport} compact />
            </Popup>
          )}
        </Map>

        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg shadow px-2 py-1.5 text-xs">
          <span className="font-semibold">{mapReports.length}</span>
          <span className="text-slate-500"> on map</span>
        </div>

        <button
          onClick={() => setMapExpanded(!mapExpanded)}
          className="absolute bottom-2 right-2 bg-white rounded-lg shadow px-3 py-1.5 text-xs font-medium text-slate-700 flex items-center gap-1 hover:bg-slate-50"
        >
          {mapExpanded ? <><Minimize2 size={14} /> Collapse</> : <><Maximize2 size={14} /> Expand</>}
        </button>

        {mapExpanded && (
          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg shadow p-2 text-xs">
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span>Clear</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span>Wet</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>Slush</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /><span>Snow</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span>Ice</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-violet-500" /><span>Whiteout</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Feed Section with Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Tab buttons */}
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'recent'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock size={16} />
            Recent
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === 'recent' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
            }`}>
              {recentReports.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('older')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'older'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History size={16} />
            Older
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === 'older' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
            }`}>
              {olderReports.length}
            </span>
          </button>
        </div>

        {/* Tab description */}
        <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100 flex-shrink-0">
          {activeTab === 'recent' 
            ? '📍 Reports from the last 12 hours' 
            : '📜 Reports from 12-48 hours ago'
          }
        </div>

        {/* Scrollable reports list */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-lg bg-slate-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-24 bg-slate-200 animate-pulse rounded" />
                      <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
                      <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && sortedReports.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="text-6xl mb-4">{activeTab === 'recent' ? '🛣️' : '📜'}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {activeTab === 'recent' ? 'No recent reports' : 'No older reports'}
              </h3>
              <p className="text-slate-600 max-w-xs">
                {activeTab === 'recent' 
                  ? 'Be the first to report road conditions! Tap the + button below.'
                  : 'No reports from 12-48 hours ago in this area.'
                }
              </p>
            </div>
          )}

          {/* Reports list */}
          {!isLoading && sortedReports.length > 0 && (
            <div className="p-4 space-y-4 pb-24">
              {sortedReports.map((report: any) => (
                <div 
                  key={report.id} 
                  id={`report-${report.id}`}
                  className={`transition-all ${
                    selectedReport?.id === report.id ? 'ring-2 ring-blue-500 rounded-xl' : ''
                  }`}
                >
                  {report.distance !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 ml-1">
                      <MapPin size={12} />
                      <span>{formatDistance(report.distance)} away</span>
                    </div>
                  )}
                  <ReportCard report={report} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}