import { useRef, useMemo, useEffect } from 'react';
import Map, { useControl } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useMap } from '../../../contexts/MapContext';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';
import { useGetTargets } from '../../../utils/hooks/useGetTargets';
import { useGetThreats } from '../../../utils/hooks/useGetThreats';
import { useUdpLayers } from './UdpLayers';
import 'mapbox-gl/dist/mapbox-gl.css';

// Deck.gl overlay component
function DeckGLOverlay({ layers }: { layers: any[] }): null {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({}));
  
  useEffect(() => {
    overlay.setProps({ layers });
  }, [overlay, layers]);

  return null;
}

/**
 * Calculate distance in nautical miles from zoom level and pixel radius
 */
function calculateDistanceNM(zoom: number, pixelRadius: number, latitude: number): number {
  // Meters per pixel at given zoom and latitude
  const metersPerPixel = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
  // Convert pixels to meters
  const meters = pixelRadius * metersPerPixel;
  // Convert meters to nautical miles (1 NM = 1852 meters)
  return meters / 1852;
}

/**
 * Format distance for display
 */
function formatDistance(nm: number): string {
  if (nm >= 100) {
    return `${Math.round(nm)}nm`;
  } else if (nm >= 10) {
    return `${Math.round(nm * 10) / 10}nm`;
  } else {
    return `${Math.round(nm * 100) / 100}nm`;
  }
}

/**
 * Radar rings component - renders concentric circles with distance markings
 * Dynamic based on zoom level, centered on viewport
 */
function RadarRingsOverlay({ zoom, centerLat }: { zoom: number; centerLat: number }) {
  // Use fixed reference dimensions - only update on mount to prevent recalculation
  const containerDimensionsRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Only update dimensions on significant window resize, but use ref to avoid triggering recalculation
  useEffect(() => {
    const handleResize = () => {
      containerDimensionsRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate circle sizes and distances - ONLY based on zoom (rounded to prevent micro-changes)
  // Use a fixed reference latitude that only updates when zoom changes significantly
  const stableZoom = useMemo(() => Math.floor(zoom * 10) / 10, [zoom]); // Round to 0.1 precision
  const fixedLatRef = useRef(centerLat);
  const lastZoomRef = useRef(stableZoom);
  
  // Only update fixedLat when zoom changes significantly
  if (Math.abs(stableZoom - lastZoomRef.current) > 0.05) {
    fixedLatRef.current = centerLat;
    lastZoomRef.current = stableZoom;
  }
  
  const ringData = useMemo(() => {
    const minDimension = Math.min(containerDimensionsRef.current.width, containerDimensionsRef.current.height);
    const maxCircleSize = minDimension * 0.8;
    const numCircles = 3;
    const spacingStep = maxCircleSize / numCircles;

    // Calculate distances for each ring using fixed latitude reference
    const ringDistances = Array.from({ length: numCircles }, (_, i) => {
      const circleSize = (i + 1) * spacingStep;
      const distanceNM = calculateDistanceNM(stableZoom, circleSize / 2, fixedLatRef.current);
      return { size: circleSize, distanceNM };
    });

    return { ringDistances };
  }, [stableZoom]); // Only depend on zoom!

  const { ringDistances } = ringData;

  return (
    <div 
      id="radar-circles-container"
      className="absolute inset-0 pointer-events-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* Crosshairs */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: '1px',
          height: '100%',
          background: '#00ff00',
          opacity: 0.6,
          pointerEvents: 'none',
          transform: 'translateX(-50%)',
          zIndex: 5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          width: '100%',
          height: '1px',
          background: '#00ff00',
          opacity: 0.6,
          pointerEvents: 'none',
          transform: 'translateY(-50%)',
          zIndex: 5,
        }}
      />

      {/* Concentric Circles with distance labels */}
      {ringDistances.map((ring, i) => (
        <div key={i}>
          {/* Circle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${ring.size}px`,
              height: `${ring.size}px`,
              margin: 0,
              border: 'clamp(1px, 0.15vw, 2px) solid #00ff00',
              borderRadius: '50%',
              pointerEvents: 'none',
              boxSizing: 'border-box',
              opacity: 0.7,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}
          />
          {/* Distance label (positioned well outside the ring, at 0 degrees, right side) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${ring.size / 2 + 40}px), calc(-50% - 25px))`,
              color: '#ffffff',
              fontSize: 'clamp(14px, 1.6vw, 20px)',
              fontWeight: 'bold',
              textShadow: 
                '0 0 2px #000000, 0 0 4px #000000, ' +
                '-1px -1px 0 #0066ff, 1px -1px 0 #0066ff, -1px 1px 0 #0066ff, 1px 1px 0 #0066ff, ' +
                '0 0 8px rgba(0, 102, 255, 0.8), 0 0 12px rgba(0, 102, 255, 0.6)',
              pointerEvents: 'none',
              zIndex: 15,
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              WebkitTextStroke: '1px #0066ff',
            }}
          >
            {formatDistance(ring.distanceNM)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RadarView() {
  const { isMapVisible, viewMode, zoomLevel, center, setZoom } = useMap();
  const { nodes } = useGetNetworkMembers();
  const { targets } = useGetTargets();
  const mapRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingViewStateRef = useRef<{ zoom: number; longitude: number; latitude: number } | null>(null);
  const isUserInteractingRef = useRef(false);
  const lastAppliedRef = useRef<{ zoom: number; longitude: number; latitude: number } | null>(null);

  // Only render in radar mode when map is OFF
  const shouldShow = viewMode === 'normal' && !isMapVisible;
  
  const { threats } = useGetThreats();
  
  // Generate UDP layers for radar view (visible when map is off)
  const udpLayers = useUdpLayers({ nodes, targets, threats, visible: shouldShow });

  // Find mother aircraft from nodes
  const motherAircraft = useMemo(() => {
    for (const node of nodes.values()) {
      if (node.internalData?.isMotherAc === 1 || node.globalId === 10) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  // Use mother aircraft position as center, fallback to context center
  const currentCenter = useMemo<[number, number]>(() => {
    if (motherAircraft && 
        typeof motherAircraft.longitude === 'number' && 
        typeof motherAircraft.latitude === 'number' &&
        Number.isFinite(motherAircraft.longitude) &&
        Number.isFinite(motherAircraft.latitude)) {
      return [motherAircraft.longitude, motherAircraft.latitude];
    }
    return center.radar;
  }, [motherAircraft, center.radar]);

  const currentZoom = zoomLevel.radar;

  const initialViewState = useMemo(() => ({
    longitude: currentCenter[0],
    latitude: currentCenter[1],
    zoom: currentZoom,
    pitch: 0,
    bearing: 0,
  }), [currentCenter, currentZoom]);

  // Map style with WRONG tile URL - map tiles won't load, but DeckGL layers work!
  const mapStyle = useMemo(() => ({
    version: 8 as const,
    sources: {
      'local-tiles': {
        type: 'raster' as const,
        tiles: ['/wrong-tiles/{z}/{x}/{y}.png'], // WRONG URL - 404s are suppressed
        tileSize: 256,
        minzoom: 1,
        maxzoom: 9,
      },
    },
    layers: [
      {
        id: 'local-tiles-layer',
        type: 'raster' as const,
        source: 'local-tiles',
        paint: { 'raster-opacity': 1.0 },
      },
    ],
  }), []);

  // Clone layers for fresh WebGL context
  const deckGlLayers = useMemo((): any[] => {
    return udpLayers.map((layer: any) => layer.clone({}));
  }, [udpLayers]);

  // Sync map view state to context
  const flushPendingViewState = () => {
    const pending = pendingViewStateRef.current;
    if (!pending) return;
    pendingViewStateRef.current = null;

    if (Math.abs(pending.zoom - currentZoom) > 0.01) {
      setZoom(pending.zoom);
    }

    // Center is fixed to mother aircraft, so don't update center from user interaction
  };

  const scheduleFlush = () => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      flushPendingViewState();
    });
  };

  const handleMove = (event: any) => {
    if (!event.viewState) return;
    // Only allow zoom changes, center is fixed to mother aircraft
    pendingViewStateRef.current = {
      zoom: Math.max(1, Math.min(18, event.viewState.zoom ?? currentZoom)),
      longitude: currentCenter[0], // Keep center fixed
      latitude: currentCenter[1], // Keep center fixed
    };
    scheduleFlush();
  };

  const handleMoveEnd = (event: any) => {
    if (!event.viewState) return;
    isUserInteractingRef.current = false;

    // Only allow zoom changes, center is fixed to mother aircraft
    pendingViewStateRef.current = {
      zoom: Math.max(1, Math.min(18, event.viewState.zoom ?? currentZoom)),
      longitude: currentCenter[0], // Keep center fixed
      latitude: currentCenter[1], // Keep center fixed
    };
    flushPendingViewState();
  };

  // Sync context changes to map
  useEffect(() => {
    if (isUserInteractingRef.current) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const clampedZoom = Math.max(1, Math.min(18, currentZoom));
    const currentMapZoom = map.getZoom();
    const currentMapCenter = map.getCenter();

    const needsZoom = Math.abs(currentMapZoom - clampedZoom) > 0.01;
    const needsCenter =
      Math.abs(currentMapCenter.lng - currentCenter[0]) > 0.0001 ||
      Math.abs(currentMapCenter.lat - currentCenter[1]) > 0.0001;

    if (!needsZoom && !needsCenter) return;

    const last = lastAppliedRef.current;
    if (
      last &&
      Math.abs(last.zoom - clampedZoom) < 0.01 &&
      Math.abs(last.longitude - currentCenter[0]) < 0.0001 &&
      Math.abs(last.latitude - currentCenter[1]) < 0.0001
    ) {
      return;
    }

    lastAppliedRef.current = {
      zoom: clampedZoom,
      longitude: currentCenter[0],
      latitude: currentCenter[1],
    };

    map.jumpTo({
      zoom: clampedZoom,
      center: currentCenter,
    });
  }, [currentZoom, currentCenter]);

  return (
    <div 
      className="w-full h-full bg-[#000000] relative overflow-hidden"
      style={{ display: shouldShow ? 'block' : 'none' }}
    >
      {/* Map with wrong tile URL - DeckGL layers still render! */}
      <div className="absolute inset-0 w-full h-full z-10">
        <Map
          ref={mapRef}
          mapboxAccessToken="pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          initialViewState={initialViewState as any}
          minZoom={1}
          maxZoom={18}
          dragPan={false}
          dragRotate={false}
          scrollZoom={false}
          doubleClickZoom={false}
          touchZoomRotate={false}
          touchPitch={false}
          keyboard={false}
          attributionControl={false}
          preserveDrawingBuffer={true}
          onMoveStart={() => {
            isUserInteractingRef.current = true;
          }}
          onMove={handleMove}
          onMoveEnd={handleMoveEnd}
          onError={(e: any) => {
            // Suppress tile loading errors - expected since we use wrong URL
            if (
              e.error?.message?.includes('Could not load image') ||
              e.error?.message?.includes('404') ||
              e.error?.message?.includes('SVG')
            ) {
              return;
            }
            console.error('Map error:', e);
          }}
        >
          <DeckGLOverlay layers={deckGlLayers} />
        </Map>
      </div>
      
      {/* Radar rings overlay */}
      <RadarRingsOverlay zoom={currentZoom} centerLat={currentCenter[1]} />
    </div>
  );
}
