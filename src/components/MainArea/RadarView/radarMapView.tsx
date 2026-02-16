import { useRef, useEffect, useMemo } from 'react';
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

export function RadarMapView() {
  const mapRef = useRef<any>(null);
  const { 
    isMapVisible, 
    zoomLevel, 
    center, 
    setZoom, 
    setCenter, 
    panEnabled,
    viewMode 
  } = useMap();
  const { nodes } = useGetNetworkMembers();
  const { targets } = useGetTargets();
  const { threats } = useGetThreats();
  const udpLayers = useUdpLayers({ nodes, targets, threats, visible: isMapVisible });

  // Only render in normal mode (self-only uses SelfView components)
  if (viewMode === 'self-only') {
    return null;
  }

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

  // Update map zoom and center when they change
  useEffect(() => {
    if (mapRef.current && isMapVisible) {
      const map = mapRef.current.getMap();
      if (map && map.loaded()) {
        isProgrammaticUpdateRef.current = true;
        
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
      }
    }
  }, [currentZoom, currentCenter, isMapVisible, viewMode]);

  // Handle map move/zoom events (sync back to context)
  const handleMoveEnd = (event: any) => {
    // Don't sync if this was a programmatic update
    if (isProgrammaticUpdateRef.current) {
      isProgrammaticUpdateRef.current = false;
      return;
    }

    if (event.viewState) {
      // Update zoom if changed
      if (event.viewState.zoom !== undefined) {
        const newZoom = event.viewState.zoom;
        const clampedZoom = Math.max(1, Math.min(18, newZoom));
        if (Math.abs(clampedZoom - currentZoom) > 0.01) {
          setZoom(clampedZoom);
        }
      }
      // Center is fixed to mother aircraft, so don't update center from user interaction
    }
  };

  if (!isMapVisible) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full z-10">
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
        dragPan={false}
        dragRotate={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        touchPitch={false}
        keyboard={false}
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
    </div>
  );
}

