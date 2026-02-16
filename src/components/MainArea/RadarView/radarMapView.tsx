import { useRef, useEffect, useMemo, useCallback } from 'react';
import Map, { useControl } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useMap } from '../../../contexts/MapContext';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';
import { useGetTargets } from '../../../utils/hooks/useGetTargets';
import { useGetThreats } from '../../../utils/hooks/useGetThreats';
import { useUdpLayers } from './UdpLayers';
import { RadarFilterBar } from '../../shared/RadarFilterBar';
import 'mapbox-gl/dist/mapbox-gl.css';

// Deck.gl overlay component
function DeckGLOverlay({ layers }: { layers: any[] }): null {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({}));
  
  useEffect(() => {
    overlay.setProps({ layers });
  }, [overlay, layers]);

  return null;
}

export function RadarMapView() {
  const mapRef = useRef<any>(null);
  const { 
    isMapVisible, 
    zoomLevel, 
    center, 
    setZoom, 
    setCenter, 
    viewMode,
    radarFilter,
    setRadarFilter
  } = useMap();
  const { nodes } = useGetNetworkMembers();
  const { targets } = useGetTargets();
  const { threats } = useGetThreats();
  const udpLayers = useUdpLayers({ nodes, targets, threats, visible: isMapVisible, filter: radarFilter });

  // Only render in normal mode (self-only uses SelfView components)
  if (viewMode === 'self-only') {
    return null;
  }

  // Find mother aircraft from nodes
  // Only treat as mother aircraft if isMotherAc === 1 (from opcode 102)
  const motherAircraft = useMemo(() => {
    for (const node of nodes.values()) {
      if (node.internalData?.isMotherAc === 1) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  // Helper function to calculate threat position from mother aircraft
  const calculateThreatPosition = useCallback((
    motherLat: number,
    motherLng: number,
    range: number,
    azimuth: number
  ): { latitude: number; longitude: number } => {
    const R = 6371000;
    const lat1Rad = (motherLat * Math.PI) / 180;
    const lng1Rad = (motherLng * Math.PI) / 180;
    const bearingRad = ((azimuth - 90) * Math.PI) / 180;
    const angularDistance = range / R;
    const newLatRad = Math.asin(
      Math.sin(lat1Rad) * Math.cos(angularDistance) +
      Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );
    const newLngRad = lng1Rad + Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
      Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(newLatRad)
    );
    return { latitude: (newLatRad * 180) / Math.PI, longitude: (newLngRad * 180) / Math.PI };
  }, []);

  // Calculate center based on filter
  const currentCenter = useMemo<[number, number]>(() => {
    let points: Array<{ lat: number; lng: number }> = [];

    if (radarFilter === 'network-members') {
      // When Network Member filter is selected, center on mother node
      if (motherAircraft && 
          motherAircraft.latitude !== undefined && 
          motherAircraft.longitude !== undefined &&
          Number.isFinite(motherAircraft.latitude) &&
          Number.isFinite(motherAircraft.longitude)) {
        return [motherAircraft.longitude, motherAircraft.latitude];
      }
      // Fallback: Center of bounding box of Network Members (non-mother nodes)
      Array.from(nodes.values()).forEach((node) => {
        if (
          node.internalData?.isMotherAc !== 1 &&
          node.latitude !== undefined &&
          node.longitude !== undefined &&
          Number.isFinite(node.latitude) &&
          Number.isFinite(node.longitude)
        ) {
          points.push({ lat: node.latitude, lng: node.longitude });
        }
      });
    } else if (radarFilter === 'targets') {
      // Center of bounding box of Targets
      targets.forEach((target) => {
        if (
          target.latitude !== undefined &&
          target.longitude !== undefined &&
          Number.isFinite(target.latitude) &&
          Number.isFinite(target.longitude)
        ) {
          points.push({ lat: target.latitude, lng: target.longitude });
        }
      });
    } else if (radarFilter === 'threats') {
      // Center of bounding box of Threats
      if (motherAircraft && 
          motherAircraft.latitude !== undefined && 
          motherAircraft.longitude !== undefined &&
          Number.isFinite(motherAircraft.latitude) &&
          Number.isFinite(motherAircraft.longitude)) {
        threats.forEach((threat) => {
          const position = calculateThreatPosition(
            motherAircraft.latitude!,
            motherAircraft.longitude!,
            threat.threatRange,
            threat.threatAzimuth
          );
          if (Number.isFinite(position.latitude) && Number.isFinite(position.longitude)) {
            points.push({ lat: position.latitude, lng: position.longitude });
          }
        });
      }
    } else {
      // Mother Node and All Nodes: Center of bounding box of mother aircraft
      if (motherAircraft && 
          motherAircraft.latitude !== undefined && 
          motherAircraft.longitude !== undefined &&
          Number.isFinite(motherAircraft.latitude) &&
          Number.isFinite(motherAircraft.longitude)) {
        return [motherAircraft.longitude, motherAircraft.latitude];
      }
    }

    // Calculate center from bounding box
    if (points.length > 0) {
      const lats = points.map((p) => p.lat);
      const lngs = points.map((p) => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      return [centerLng, centerLat];
    }

    // Fallback to context center
    return center.radar;
  }, [radarFilter, nodes, targets, threats, motherAircraft, calculateThreatPosition, center.radar]);

  // Calculate bounding box for fitting view (used when no mother aircraft)
  const boundingBox = useMemo(() => {
    let points: Array<{ lat: number; lng: number }> = [];

    if (radarFilter === 'network-members') {
      Array.from(nodes.values()).forEach((node) => {
        if (
          node.internalData?.isMotherAc !== 1 &&
          node.latitude !== undefined &&
          node.longitude !== undefined &&
          Number.isFinite(node.latitude) &&
          Number.isFinite(node.longitude)
        ) {
          points.push({ lat: node.latitude, lng: node.longitude });
        }
      });
    } else if (radarFilter === 'targets') {
      targets.forEach((target) => {
        if (
          target.latitude !== undefined &&
          target.longitude !== undefined &&
          Number.isFinite(target.latitude) &&
          Number.isFinite(target.longitude)
        ) {
          points.push({ lat: target.latitude, lng: target.longitude });
        }
      });
    } else if (radarFilter === 'threats') {
      if (motherAircraft && 
          motherAircraft.latitude !== undefined && 
          motherAircraft.longitude !== undefined &&
          Number.isFinite(motherAircraft.latitude) &&
          Number.isFinite(motherAircraft.longitude)) {
        threats.forEach((threat) => {
          const position = calculateThreatPosition(
            motherAircraft.latitude!,
            motherAircraft.longitude!,
            threat.threatRange,
            threat.threatAzimuth
          );
          if (Number.isFinite(position.latitude) && Number.isFinite(position.longitude)) {
            points.push({ lat: position.latitude, lng: position.longitude });
          }
        });
      }
    } else {
      // Mother Node and All Nodes: use mother aircraft position
      if (motherAircraft && 
          motherAircraft.latitude !== undefined && 
          motherAircraft.longitude !== undefined &&
          Number.isFinite(motherAircraft.latitude) &&
          Number.isFinite(motherAircraft.longitude)) {
        return null; // Don't fit bounds, use mother aircraft as center
      }
    }

    if (points.length === 0) {
      return null;
    }

    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];
  }, [radarFilter, nodes, targets, threats, motherAircraft, calculateThreatPosition]);

  // Get current zoom for normal radar mode
  const currentZoom = zoomLevel.radar;

  // Map style with tiles from public folder
  const mapStyle = useMemo(() => {
    return {
      version: 8 as const,
      sources: {
        'local-tiles': {
          type: 'raster' as const,
          tiles: ['tiles-map/{z}/{x}/{y}.png'],
          tileSize: 256,
          minzoom: 1,
          maxzoom: 9, // Tiles exist up to zoom 9
          maxNativeZoom: 9, // Native tile zoom level
        },
      },
      layers: [
        {
          id: 'local-tiles-layer',
          type: 'raster' as const,
          source: 'local-tiles',
          paint: {
            'raster-opacity': 1.0,
          },
        },
      ],
    };
  }, []);

  // Track if we're programmatically updating the map (to avoid syncing back)
  const isProgrammaticUpdateRef = useRef(false);

  // Fit bounds when no mother aircraft and we have nodes/targets
  const hasFittedBoundsRef = useRef(false);
  const lastFilterRef = useRef<string>('all');

  // Reset bounds fitting when filter changes
  useEffect(() => {
    if (lastFilterRef.current !== radarFilter) {
      hasFittedBoundsRef.current = false;
      lastFilterRef.current = radarFilter;
    }
  }, [radarFilter]);

  // Update map zoom and center when they change
  useEffect(() => {
    if (mapRef.current && isMapVisible) {
      const map = mapRef.current.getMap();
      if (map && map.loaded()) {
        isProgrammaticUpdateRef.current = true;

        if (motherAircraft) {
          // Mother aircraft exists - center on it and lock
          hasFittedBoundsRef.current = false;
          
          // Update zoom
          const clampedZoom = Math.max(1, Math.min(18, currentZoom));
          const currentMapZoom = map.getZoom();
          if (Math.abs(currentMapZoom - clampedZoom) > 0.01) {
            map.setZoom(clampedZoom);
          }
          
          // Update center
          const currentMapCenter = map.getCenter();
          const centerDistance = Math.sqrt(
            Math.pow(currentMapCenter.lng - currentCenter[0], 2) +
            Math.pow(currentMapCenter.lat - currentCenter[1], 2)
          );
          if (centerDistance > 0.0001) {
            map.setCenter(currentCenter);
          }
        } else if (boundingBox && !hasFittedBoundsRef.current) {
          // No mother aircraft - fit all nodes/targets in view
          try {
            map.fitBounds(boundingBox, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              duration: 500,
            });
            hasFittedBoundsRef.current = true;
          } catch (e) {
            console.error('Error fitting bounds:', e);
          }
        }
      }
    }
  }, [currentZoom, currentCenter, isMapVisible, viewMode, motherAircraft, boundingBox]);

  // Handle map move/zoom events (sync back to context)
  const handleMoveEnd = (event: any) => {
    // Don't sync if this was a programmatic update
    if (isProgrammaticUpdateRef.current) {
      isProgrammaticUpdateRef.current = false;
      return;
    }

    // Only allow user interactions when mother aircraft is NOT defined
    if (!motherAircraft && event.viewState) {
      // Update zoom if changed
      if (event.viewState.zoom !== undefined) {
        const newZoom = event.viewState.zoom;
        const clampedZoom = Math.max(1, Math.min(18, newZoom));
        if (Math.abs(clampedZoom - currentZoom) > 0.01) {
          setZoom(clampedZoom);
        }
      }
      // Update center if changed (allow user to pan when mother aircraft not defined)
      if (event.viewState.longitude !== undefined && event.viewState.latitude !== undefined) {
        const newCenter: [number, number] = [event.viewState.longitude, event.viewState.latitude];
        setCenter(newCenter);
      }
    }
    // When mother aircraft is defined, ignore user interactions (map is locked by overlay)
  };

  if (!isMapVisible) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full z-10">
      {/* Filter Bar */}
      <RadarFilterBar onFilterChange={setRadarFilter} activeFilter={radarFilter} />
      
      <Map
        ref={mapRef}
        mapboxAccessToken="pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: currentCenter[0],
          latitude: currentCenter[1],
          zoom: currentZoom,
          pitch: 0,
          bearing: 0,
        }}
        minZoom={1}
        maxZoom={18} // Allow canvas zoom beyond native tiles (9)
        dragPan={true} // Always enabled - blocked by overlay when mother aircraft exists
        dragRotate={false}
        scrollZoom={true} // Always enabled - blocked by overlay when mother aircraft exists
        doubleClickZoom={true} // Always enabled - blocked by overlay when mother aircraft exists
        touchZoomRotate={true} // Always enabled - blocked by overlay when mother aircraft exists
        touchPitch={false}
        keyboard={true} // Always enabled - blocked by overlay when mother aircraft exists
        attributionControl={false}
        preserveDrawingBuffer={true}
        onMoveEnd={handleMoveEnd}
        onError={(e: any) => {
          // Suppress tile loading errors - Mapbox will handle missing tiles by scaling existing ones
          if (
            e.error?.message?.includes('Could not load image') ||
            e.error?.message?.includes('404')
          ) {
            return;
          }
          console.error('Map error:', e);
        }}
      >
        <DeckGLOverlay layers={udpLayers} />
      </Map>
      {/* Overlay div to block panning when mother aircraft exists */}
      {motherAircraft && (
        <div className="absolute inset-0 w-full h-full z-20 pointer-events-auto" />
      )}
    </div>
  );
}

