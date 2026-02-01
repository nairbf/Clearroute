'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Map, { 
  Marker, 
  Popup, 
  NavigationControl, 
  GeolocateControl,
  type MapRef,
  type ViewStateChangeEvent 
} from 'react-map-gl/maplibre';
import useSupercluster from 'use-supercluster';
import { useAppStore } from '@/lib/store';
import { useReports } from '@/hooks/useReports';
import { ReportCard } from './ReportCard';
import { cn, getConditionColor } from '@/lib/utils';
import type { Report, ReportPoint } from '@/types';
import { CNY_CENTER, CNY_BOUNDS } from '@/types';

// Stadia Maps style URL (free tier)
const MAP_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { viewport, setViewport, filters, selectedReport, setSelectedReport } = useAppStore();
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  // Fetch reports with current filters
  const { data: reports = [], isLoading } = useReports({
    minutes: filters.minutes,
    county: filters.county !== 'all' ? filters.county : undefined,
    condition: filters.condition !== 'all' ? filters.condition : undefined,
    passability: filters.passability !== 'all' ? filters.passability : undefined,
  });

  // Convert reports to GeoJSON points for clustering
  const points: ReportPoint[] = reports.map((report) => ({
    type: 'Feature',
    properties: { 
      cluster: false,
      ...report,
    },
    geometry: {
      type: 'Point',
      coordinates: [report.location.lng, report.location.lat],
    },
  }));

  // Setup supercluster
  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds || undefined,
    zoom: viewport.zoom,
    options: { 
      radius: 60, 
      maxZoom: 16,
      map: (props) => ({
        condition: props.condition,
        passability: props.passability,
      }),
      reduce: (acc, props) => {
        // Keep worst condition in cluster
        const severity = { clear: 0, wet: 1, slush: 2, snow: 3, ice: 4, whiteout: 5 };
        if (severity[props.condition as keyof typeof severity] > severity[acc.condition as keyof typeof severity]) {
          acc.condition = props.condition;
        }
        // Keep worst passability
        const passSeverity = { ok: 0, slow: 1, avoid: 2 };
        if (passSeverity[props.passability as keyof typeof passSeverity] > passSeverity[acc.passability as keyof typeof passSeverity]) {
          acc.passability = props.passability;
        }
      },
    },
  });

  // Update bounds when map moves
  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewport({
      latitude: evt.viewState.latitude,
      longitude: evt.viewState.longitude,
      zoom: evt.viewState.zoom,
    });
  }, [setViewport]);

  const handleMoveEnd = useCallback(() => {
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

  // Initial bounds
  useEffect(() => {
    handleMoveEnd();
  }, [handleMoveEnd]);

  // Handle cluster click - zoom in
  const handleClusterClick = (clusterId: number, lat: number, lng: number) => {
    if (!supercluster) return;
    
    const zoom = Math.min(
      supercluster.getClusterExpansionZoom(clusterId),
      16
    );
    
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom,
      duration: 500,
    });
  };

  return (
    <div className="h-full w-full relative">
      <Map
        ref={mapRef}
        {...viewport}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        maxBounds={[
          [CNY_BOUNDS.west - 0.5, CNY_BOUNDS.south - 0.5],
          [CNY_BOUNDS.east + 0.5, CNY_BOUNDS.north + 0.5],
        ]}
        minZoom={7}
        maxZoom={18}
      >
        {/* Navigation controls */}
        <NavigationControl position="top-right" />
        <GeolocateControl 
          position="top-right" 
          trackUserLocation
          showUserHeading
        />

        {/* Render clusters and individual markers */}
        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            // Cluster marker
            const clusterProps = cluster.properties as any;
            const worstCondition = clusterProps.condition || 'snow';
            
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                latitude={lat}
                longitude={lng}
                anchor="center"
              >
                <div
                  className="cluster-marker"
                  style={{ 
                    backgroundColor: getConditionColor(worstCondition),
                    width: `${30 + (pointCount! / points.length) * 30}px`,
                    height: `${30 + (pointCount! / points.length) * 30}px`,
                  }}
                  onClick={() => handleClusterClick(cluster.id as number, lat, lng)}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Individual report marker
          const report = cluster.properties as Report;
          
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
                className="report-marker w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: getConditionColor(report.condition) }}
              >
                {report.condition === 'ice' ? '!' : report.condition[0].toUpperCase()}
              </div>
            </Marker>
          );
        })}

        {/* Selected report popup */}
        {selectedReport && (
          <Popup
            latitude={selectedReport.location.lat}
            longitude={selectedReport.location.lng}
            anchor="bottom"
            onClose={() => setSelectedReport(null)}
            closeButton={true}
            closeOnClick={false}
            className="report-popup"
            maxWidth="320px"
          >
            <ReportCard report={selectedReport} compact />
          </Popup>
        )}
      </Map>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-600">Loading reports...</span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold mb-2">Road Conditions</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-condition-clear" />
            <span>Clear</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-condition-wet" />
            <span>Wet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-condition-slush" />
            <span>Slush</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-condition-snow" />
            <span>Snow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-condition-ice" />
            <span>Ice</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-condition-whiteout" />
            <span>Whiteout</span>
          </div>
        </div>
      </div>

      {/* Report count */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-sm">
        <span className="font-semibold">{reports.length}</span>
        <span className="text-slate-500"> reports in last {filters.minutes} min</span>
      </div>
    </div>
  );
}
