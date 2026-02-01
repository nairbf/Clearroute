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
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import type { Report } from '@/types';

const MAP_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';

const CNY_CENTER = { lat: 43.0481, lng: -76.1474 };
const CNY_BOUNDS: [[number, number], [number, number]] = [
  [-77.5, 42.0],
  [-74.5, 44.5],
];

export function MainView() {
  const mapRef = useRef<MapRef>(null);
  const { filters, selectedReport, setSelectedReport } = useAppStore();
  const [mapExpanded, setMapExpanded] = useState(false);
  
  const [viewState, setViewState] = useState({
    latitude: CNY_CENTER.lat,
    longitude: CNY_CENTER.lng,
    zoom: 9,
  });
  const [bounds, setBounds] = useState<[number, number, number, number]>([-77.5, 42.0, -74.5, 44.5]);

  const { data: reports = [], isLoading, refetch } = useReports({
    minutes: filters.minutes,
    county: filters.county !== 'all' ? filters.county : undefined,
    condition: filters.condition !== 'all' ? filters.condition : undefined,
    passability: filters.passability !== 'all' ? filters.passability : undefined,
  });

  // Filter reports with valid locations
  const validReports = useMemo(() => {
    return reports.filter(r => 
      r.location && 
      typeof r.location.lat === 'number' && 
      typeof r.location.lng === 'number' &&
      r.location.lat !== 0 &&
      r.location.lng !== 0
    );
  }, [reports]);

  // Convert to GeoJSON points
  const points = useMemo(() => 
    validReports.map((report) => ({
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
    })), [validReports]);

  // Clustering
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
    // Scroll to the report in the feed
    const element = document.getElementById(`report-${report.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Map Section */}
      <div className={`relative transition-all duration-300 ${mapExpanded ? 'h-[60vh]' : 'h-48'}`}>
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

          {/* Clusters and markers */}
          {clusters.map((cluster) => {
            const [lng, lat] = cluster.geometry.coordinates;
            const { cluster: isCluster, point_count: pointCount } = cluster.properties;

            if (isCluster) {
              const size = Math.min(45, Math.max(28, 28 + (pointCount / points.length) * 25));
              return (
                <Marker
                  key={`cluster-${cluster.id}`}
                  latitude={lat}
                  longitude={lng}
                  anchor="center"
                >
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

          {/* Popup */}
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

        {/* Map overlay - report count and legend */}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg shadow px-2 py-1.5 text-xs">
          <span className="font-semibold">{validReports.length}</span>
          <span className="text-slate-500"> reports</span>
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => setMapExpanded(!mapExpanded)}
          className="absolute bottom-2 right-2 bg-white rounded-lg shadow px-3 py-1.5 text-xs font-medium text-slate-700 flex items-center gap-1 hover:bg-slate-50"
        >
          {mapExpanded ? (
            <>
              <Minimize2 size={14} />
              Collapse
            </>
          ) : (
            <>
              <Maximize2 size={14} />
              Expand
            </>
          )}
        </button>

        {/* Legend - only show when expanded */}
        {mapExpanded && (
          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg shadow p-2 text-xs">
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span>Clear</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Wet</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Slush</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Snow</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Ice</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span>Whiteout</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feed Section */}
      <div className="flex-1 overflow-y-auto">
        {/* Filter summary */}
        <div className="sticky top-0 z-10 bg-slate-100 px-4 py-2 border-b border-slate-200">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold">{reports.length}</span> reports
            {filters.county !== 'all' && (
              <> in <span className="font-semibold capitalize">{filters.county}</span> County</>
            )}
            {' '}from the last <span className="font-semibold">{filters.minutes}</span> minutes
          </p>
        </div>

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
        {!isLoading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="text-6xl mb-4">🛣️</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No reports yet
            </h3>
            <p className="text-slate-600 max-w-xs">
              Be the first to report road conditions in your area! 
              Tap the + button below to add a report.
            </p>
          </div>
        )}

        {/* Reports list */}
        {!isLoading && reports.length > 0 && (
          <div className="p-4 space-y-4 pb-24">
            {reports.map((report) => (
              <div 
                key={report.id} 
                id={`report-${report.id}`}
                className={`transition-all ${
                  selectedReport?.id === report.id ? 'ring-2 ring-blue-500 rounded-xl' : ''
                }`}
              >
                <ReportCard report={report} />
              </div>
            ))}
            
            {/* End of list */}
            <div className="text-center py-4 text-sm text-slate-500">
              You've seen all {reports.length} reports
            </div>
          </div>
        )}
      </div>
    </div>
  );
}