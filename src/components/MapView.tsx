'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
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
import { getMapStyle } from '@/lib/mapStyles';
import type { Report } from '@/types';

const CNY_CENTER = { lat: 43.0481, lng: -76.1474 };
const CNY_BOUNDS: [[number, number], [number, number]] = [
  [-77.5, 42.0],
  [-74.5, 44.5],
];

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { filters, selectedReport, setSelectedReport } = useAppStore();
  
  const [viewState, setViewState] = useState({
    latitude: CNY_CENTER.lat,
    longitude: CNY_CENTER.lng,
    zoom: 9,
  });
  const [bounds, setBounds] = useState<[number, number, number, number]>([-77.5, 42.0, -74.5, 44.5]);

  const { data: reports = [], isLoading } = useReports({
    minutes: filters.minutes,
    county: filters.county !== 'all' ? filters.county : undefined,
    condition: filters.condition !== 'all' ? filters.condition : undefined,
    passability: filters.passability !== 'all' ? filters.passability : undefined,
  });

  // Filter reports with valid locations
  const validReports = useMemo(() => {
    const valid = reports.filter(r => 
      r.location && 
      typeof r.location.lat === 'number' && 
      typeof r.location.lng === 'number' &&
      r.location.lat !== 0 &&
      r.location.lng !== 0
    );
    console.log(`MapView: ${reports.length} total, ${valid.length} with valid locations`);
    if (valid.length > 0) {
      console.log('First valid report location:', valid[0].location);
    }
    return valid;
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

  // Update bounds
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

  useEffect(() => {
    const timer = setTimeout(updateBounds, 100);
    return () => clearTimeout(timer);
  }, [updateBounds]);

  const handleClusterClick = useCallback((clusterId: number, lat: number, lng: number) => {
    if (!supercluster) return;
    const zoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 16);
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 });
  }, [supercluster]);

  return (
    <div className="h-full w-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onMoveEnd={updateBounds}
        mapStyle={getMapStyle('alidade_smooth')}
        style={{ width: '100%', height: '100%' }}
        maxBounds={CNY_BOUNDS}
        minZoom={7}
        maxZoom={18}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" trackUserLocation />

        {/* Render clusters and individual markers */}
        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates;

          const isCluster = cluster.properties.cluster as boolean;

          if (isCluster) {
            const pointCount = (cluster.properties as any).point_count as number;
            const clusterId =
              (cluster.id as number) ?? ((cluster.properties as any).cluster_id as number);

            const size = Math.min(
              50,
              Math.max(30, 30 + (pointCount / Math.max(points.length, 1)) * 30)
            );

            return (
              <Marker
                key={`cluster-${clusterId}`}
                latitude={lat}
                longitude={lng}
                anchor="center"
              >
                <div
                  onClick={() => handleClusterClick(clusterId, lat, lng)}
                  className="rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform bg-blue-600"
                  style={{ width: `${size}px`, height: `${size}px` }}
                >
                  <span className="text-white font-bold text-sm">{pointCount}</span>
                </div>
              </Marker>
            );
          }

          const report = (cluster.properties as any).report as Report;
          const isSelected = selectedReport?.id === report.id;

          return (
            <Marker
              key={`report-${report.id}`}
              latitude={lat}
              longitude={lng}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedReport(report);
              }}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs cursor-pointer transition-transform ${
                  isSelected ? 'scale-125 ring-4 ring-blue-400' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: getConditionColor(report.condition) }}
              >
                {report.condition === 'ice' || report.condition === 'whiteout'
                  ? '!'
                  : report.condition[0].toUpperCase()}
              </div>
            </Marker>
          );
        })}


        {/* Popup */}
        {selectedReport && selectedReport.location && (
          <Popup
            latitude={selectedReport.location.lat}
            longitude={selectedReport.location.lng}
            anchor="bottom"
            onClose={() => setSelectedReport(null)}
            closeButton={true}
            closeOnClick={false}
            maxWidth="320px"
            offset={20}
          >
            <ReportCard report={selectedReport} compact />
          </Popup>
        )}
      </Map>

      {/* Loading */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-600">Loading...</span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold mb-2">Road Conditions</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Clear</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Wet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Slush</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Snow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Ice</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span>Whiteout</span>
          </div>
        </div>
      </div>

      {/* Report count */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-sm">
        <span className="font-semibold">{validReports.length}</span>
        <span className="text-slate-500"> reports on map</span>
      </div>
    </div>
  );
}
