import React, { useRef, useMemo, useEffect } from 'react';
import Map, { useControl } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useMap } from '../../../contexts/MapContext';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';
import { useSelfViewLayers } from './useSelfViewLayers';
import 'mapbox-gl/dist/mapbox-gl.css';

// Deck.gl overlay component
function DeckGLOverlay({ layers }: { layers: any[] }): null {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({}));
  
  useEffect(() => {
    overlay.setProps({ layers });
  }, [overlay, layers]);

  return null;
}

// Compass overlay component - matches UDPNodesManager createHUDCompass exactly
function CompassOverlay({ 
  heading, 
  mapRef, 
  motherAircraft,
  isMapOff = false,
  containerRef
}: { 
  heading: number;
  mapRef: React.RefObject<any>;
  motherAircraft: any;
  isMapOff?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  const safeHeading = typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;
  const [screenPosition, setScreenPosition] = React.useState<{ x: number; y: number } | null>(null);
  
  // Normalize heading to 0-360
  let normalizedHeading = safeHeading;
  while (normalizedHeading < 0) normalizedHeading += 360;
  while (normalizedHeading >= 360) normalizedHeading -= 360;

  // Reduced radius for SLF screen (matching UDPNodesManager)
  const radius = 180;
  const size = radius * 2 + 100; // Padding for labels

  // When map is off, calculate position from mother aircraft lat/lng to ensure alignment
  // Even when map is off, we need to project the mother aircraft position to center the compass
  React.useEffect(() => {
    if (!mapRef.current || !motherAircraft || 
        motherAircraft.latitude === undefined || motherAircraft.longitude === undefined) {
      if (isMapOff) {
        // If map is off and no mother aircraft, center on container
        if (containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setScreenPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        } else {
          setScreenPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
        }
      } else {
        setScreenPosition(null);
      }
      return;
    }

    const map = mapRef.current.getMap();
    if (!map) {
      if (isMapOff) {
        // Fallback to container center if map not available
        if (containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setScreenPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }
      } else {
        setScreenPosition(null);
      }
      return;
    }

    // Wait for map to be loaded before projecting
    if (!map.loaded()) {
      const onLoad = () => {
        try {
          const point = map.project([motherAircraft.longitude, motherAircraft.latitude]);
          const container = map.getContainer();
          const containerRect = container.getBoundingClientRect();
          
          setScreenPosition({
            x: containerRect.left + point.x,
            y: containerRect.top + point.y,
          });
        } catch (error) {
          console.warn('Failed to project mother aircraft position:', error);
          if (isMapOff && containerRef?.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setScreenPosition({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          } else {
            setScreenPosition(null);
          }
        }
      };
      map.once('load', onLoad);
      return () => {
        map.off('load', onLoad);
      };
    }

    try {
      const point = map.project([motherAircraft.longitude, motherAircraft.latitude]);
      const container = map.getContainer();
      const containerRect = container.getBoundingClientRect();
      
      setScreenPosition({
        x: containerRect.left + point.x,
        y: containerRect.top + point.y,
      });
    } catch (error) {
      console.warn('Failed to project mother aircraft position:', error);
      if (isMapOff && containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setScreenPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      } else {
        setScreenPosition(null);
      }
    }
  }, [mapRef, motherAircraft, isMapOff, containerRef]);

  // Update position on map move/zoom - works for both map on and off
  React.useEffect(() => {
    if (!mapRef.current || !motherAircraft) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const updatePosition = () => {
      if (!motherAircraft.latitude || !motherAircraft.longitude) {
        if (isMapOff && containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setScreenPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }
        return;
      }
      try {
        const point = map.project([motherAircraft.longitude, motherAircraft.latitude]);
        const container = map.getContainer();
        const containerRect = container.getBoundingClientRect();
        
        setScreenPosition({
          x: containerRect.left + point.x,
          y: containerRect.top + point.y,
        });
      } catch (error) {
        // Silently fail, but fallback to container center if map is off
        if (isMapOff && containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setScreenPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }
      }
    };

    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    map.on('resize', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      map.off('resize', updatePosition);
    };
  }, [mapRef, motherAircraft, isMapOff, containerRef]);

  if (!screenPosition) {
    return null;
  }

  return (
    <div
      id="hud-compass-102"
      style={{
        position: 'fixed',
        top: `${screenPosition.y}px`,
        left: `${screenPosition.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        marginTop: `-${size / 2}px`,
        marginLeft: `-${size / 2}px`,
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'block',
        visibility: 'visible',
        opacity: 1,
        transformOrigin: 'center center',
        transition: 'top 0.1s ease-out, left 0.1s ease-out',
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id="glow-green-bright">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow-green-strong">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background ring for better contrast */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 2}
          stroke="rgba(0, 0, 0, 0.6)"
          strokeWidth="6"
          fill="none"
          opacity="0.8"
        />
        
        {/* Outer compass circle - brighter green with stronger glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#00ff88"
          strokeWidth="3"
          fill="none"
          opacity="1"
          style={{
            filter: 'drop-shadow(0 0 8px #00ff88) drop-shadow(0 0 16px rgba(0,255,136,0.8)) drop-shadow(0 0 24px rgba(0,255,136,0.4))',
          }}
        />

        {/* Tick marks every 10°, longer every 30° with heading labels */}
        {Array.from({ length: 36 }, (_, i) => {
          const deg = i * 10;
          const angleRad = ((deg - 90) * Math.PI) / 180; // 0° at top
          const isMajor = deg % 30 === 0;
          const tickOuter = radius;
          const tickInner = radius - (isMajor ? 18 : 8);
          const centerX = size / 2;
          const centerY = size / 2;

          const x1 = centerX + Math.cos(angleRad) * tickOuter;
          const y1 = centerY + Math.sin(angleRad) * tickOuter;
          const x2 = centerX + Math.cos(angleRad) * tickInner;
          const y2 = centerY + Math.sin(angleRad) * tickInner;

          return (
            <g key={deg}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? "#00ff88" : "#00ff66"}
                strokeWidth={isMajor ? "3.5" : "2"}
                opacity={isMajor ? "1" : "0.9"}
                style={{
                  filter: isMajor
                    ? 'drop-shadow(0 0 6px #00ff88) drop-shadow(0 0 12px rgba(0,255,136,0.6))'
                    : 'drop-shadow(0 0 3px #00ff66) drop-shadow(0 0 6px rgba(0,255,102,0.4))',
                }}
              />
              {isMajor && (
                <text
                  x={centerX + Math.cos(angleRad) * (radius + 40)}
                  y={centerY + Math.sin(angleRad) * (radius + 40)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontFamily="Arial, sans-serif"
                  fontSize="26"
                  fontWeight="bold"
                  letterSpacing="1.5"
                  opacity="1"
                  style={{
                    textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.7), 0 0 16px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,1)',
                    stroke: '#000000',
                    strokeWidth: '0.5px',
                    paintOrder: 'stroke fill',
                  }}
                >
                  {deg}°
                </text>
              )}
            </g>
          );
        })}

        {/* Lubber line (fixed top reference) - brighter yellow with stronger glow */}
        <line
          x1={size / 2}
          y1={size / 2 - radius}
          x2={size / 2}
          y2={size / 2 - radius + 30}
          stroke="#ffff00"
          strokeWidth="4"
          style={{
            filter: 'drop-shadow(0 0 8px #ffff00) drop-shadow(0 0 16px rgba(255,255,0,0.8)) drop-shadow(0 0 24px rgba(255,255,0,0.5))',
          }}
        />

        {/* Inner dashed range circles - brighter cyan */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius * 0.7}
          stroke="#00ffff"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6 4"
          opacity="0.9"
          style={{
            filter: 'drop-shadow(0 0 6px #00ffff) drop-shadow(0 0 12px rgba(0,255,255,0.8)) drop-shadow(0 0 18px rgba(0,255,255,0.4))',
          }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius * 0.5}
          stroke="#00dddd"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 4"
          opacity="0.8"
          style={{
            filter: 'drop-shadow(0 0 4px #00dddd) drop-shadow(0 0 8px rgba(0,221,221,0.6))',
          }}
        />
      </svg>

      {/* Red triangular pin (rotates with heading) */}
      <div
        id="hud-compass-pointer-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          transform: `rotate(${normalizedHeading}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 0.3s ease-out',
          zIndex: 1002,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: `${size / 2 - radius * 0.6}px`,
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '18px solid #ff3333',
            filter: 'drop-shadow(0 0 6px rgba(255,50,50,0.9))',
          }}
        />
      </div>

      {/* Heading display at top - positioned well above compass */}
      <div
        id="compass-heading-display"
        style={{
          position: 'absolute',
          top: 'clamp(-50px, -6vh, -60px)',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffff00',
          fontFamily: 'Arial, sans-serif',
          fontSize: 'clamp(16px, 1.8vw, 20px)',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 1003,
          pointerEvents: 'none',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: 'clamp(4px, 0.5vh, 6px) clamp(10px, 1.5vw, 14px)',
          borderRadius: '4px',
          border: '1.5px solid #ffff00',
          boxShadow: '0 0 8px rgba(255,255,0,0.5), 0 0 16px rgba(255,255,0,0.2)',
          textShadow: '0 0 6px rgba(255,255,0,0.8), 0 0 10px rgba(255,255,0,0.5), 1px 1px 2px rgba(0,0,0,0.9)',
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
        }}
      >
        {normalizedHeading.toFixed(0).padStart(3, '0')}°
      </div>
    </div>
  );
}


export function RadarView() {
  const { isMapVisible, viewMode, zoomLevel, center, setCenter } = useMap();
  const { nodes } = useGetNetworkMembers();
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only render in self-only mode when map is OFF
  const shouldShow = viewMode === 'self-only' && !isMapVisible;
  
  // Only show mother aircraft in self view - use deck.gl layers
  const udpLayers = useSelfViewLayers({ nodes, visible: shouldShow });

  // Use self center and zoom for self view
  const currentZoom = zoomLevel.self;
  const currentCenter = center.self;

  // Get mother aircraft data (from opcode 102 where isMotherAc == 1)
  const motherAircraft = useMemo(() => {
    return Array.from(nodes.values()).find(
      (node) => node.globalId === 10 || node.internalData?.isMotherAc === 1
    );
  }, [nodes]);

  // Get mother aircraft heading for compass (trueHeading from opcode 101)
  const motherAircraftHeading = useMemo(() => {
    let currentHeading = 0;
    
    if (motherAircraft) {
      if (motherAircraft.trueHeading !== undefined && !isNaN(motherAircraft.trueHeading)) {
        currentHeading = motherAircraft.trueHeading;
      } else if (motherAircraft.heading !== undefined && !isNaN(motherAircraft.heading)) {
        currentHeading = motherAircraft.heading;
      }
    }
    
    // Normalize heading to 0-360 range
    while (currentHeading < 0) currentHeading += 360;
    while (currentHeading >= 360) currentHeading -= 360;
    
    return currentHeading;
  }, [motherAircraft]);

  // Calculate mother aircraft info for display (matching old self screen)
  const motherAircraftInfo = useMemo(() => {
    if (!motherAircraft) return null;

    const metadata = motherAircraft.regionalData?.metadata || {};
    const baroAltitude = metadata.baroAltitude;
    const groundSpeed = metadata.groundSpeed;
    const mach = metadata.mach;
    
    // Fallback to direct node properties
    const finalBaroAltitude = baroAltitude !== undefined ? baroAltitude : motherAircraft.altitude;
    const finalGroundSpeed = groundSpeed;
    const finalMach = mach;
    
    const callsign = motherAircraft.callsign || null;
    const isMotherAc = motherAircraft.internalData?.isMotherAc === 1;

    return {
      globalId: motherAircraft.globalId,
      callsign,
      isMotherAc,
      latitude: motherAircraft.latitude,
      longitude: motherAircraft.longitude,
      altitude: motherAircraft.altitude,
      baroAltitude: finalBaroAltitude,
      groundSpeed: finalGroundSpeed,
      mach: finalMach,
    };
  }, [motherAircraft]);

  const initialViewState = useMemo(() => {
    const centerLng = motherAircraft?.longitude ?? currentCenter[0];
    const centerLat = motherAircraft?.latitude ?? currentCenter[1];
    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom: currentZoom,
      pitch: 0,
      bearing: 0,
    };
  }, [motherAircraft, currentCenter, currentZoom]);

  // Map style with tiles from public folder
  const mapStyle = useMemo(() => ({
    version: 8 as const,
    sources: {
      'local-tiles': {
        type: 'raster' as const,
        tiles: ['/wrong-tiles/{z}/{x}/{y}.png'],
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

  // Update context center when mother aircraft position changes
  useEffect(() => {
    if (motherAircraft && motherAircraft.latitude !== undefined && motherAircraft.longitude !== undefined) {
      const newCenter: [number, number] = [motherAircraft.longitude, motherAircraft.latitude];
      const distance = Math.sqrt(
        Math.pow(newCenter[0] - center.self[0], 2) +
        Math.pow(newCenter[1] - center.self[1], 2)
      );
      if (distance > 0.0001) {
        setCenter(newCenter);
      }
    }
  }, [motherAircraft, center.self, setCenter]);

  // Sync context changes to map - always keep centered on mother aircraft
  // This is critical for map-off mode to ensure mother aircraft icon aligns with compass center
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !shouldShow) return;

    // Always center on mother aircraft when available
    let targetCenter = currentCenter;
    if (motherAircraft && motherAircraft.latitude !== undefined && motherAircraft.longitude !== undefined) {
      targetCenter = [motherAircraft.longitude, motherAircraft.latitude];
      // Update context center to match
      if (Math.abs(targetCenter[0] - currentCenter[0]) > 0.0001 || 
          Math.abs(targetCenter[1] - currentCenter[1]) > 0.0001) {
        setCenter(targetCenter);
      }
    }

    const clampedZoom = Math.max(1, Math.min(18, currentZoom));
    
    // Check if map needs to be updated
    const currentMapCenter = map.getCenter();
    const centerDistance = Math.sqrt(
      Math.pow(currentMapCenter.lng - targetCenter[0], 2) +
      Math.pow(currentMapCenter.lat - targetCenter[1], 2)
    );
    const currentMapZoom = map.getZoom();
    const needsUpdate = centerDistance > 0.0001 || Math.abs(currentMapZoom - clampedZoom) > 0.01;

    if (needsUpdate) {
      // Use jumpTo to ensure immediate centering, especially important at low zoom levels
      map.jumpTo({
        zoom: clampedZoom,
        center: targetCenter,
      });
    }
    
    // Trigger repaint after view change to ensure layers render
    // The compass position will be updated by the existing move/zoom event handlers
    requestAnimationFrame(() => {
      if (map && map.loaded()) {
        map.triggerRepaint();
        // Force a move event to trigger compass position update
        map.fire('move');
      }
    });
  }, [currentZoom, currentCenter, motherAircraft, shouldShow, setCenter]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#000000] relative overflow-hidden"
      style={{ display: shouldShow ? 'block' : 'none' }}
    >
      {/* Mother Aircraft Info Panel - Top Left (matching old self screen) */}
      {motherAircraftInfo && (
        <div className="fixed top-[clamp(10px,1.5vh,15px)] left-[clamp(10px,1.5vw,15px)] z-[1000] pointer-events-none bg-[rgba(20,20,20,0.98)] border-2 border-white rounded p-[clamp(6px,0.8vh,8px)_clamp(8px,1vw,10px)] text-white font-mono text-sm font-bold max-w-[clamp(220px,25vw,280px)] min-w-[180px]">
          {/* NETWORK NODE header */}
          <div className="text-white font-black mb-1 text-base border-b border-white pb-0.5">
            NETWORK NODE {motherAircraftInfo.globalId}
          </div>

          {/* CALLSIGN */}
          {motherAircraftInfo.callsign && (
            <div className="text-white font-extrabold mb-0.5 text-sm">
              CALLSIGN: {motherAircraftInfo.callsign}
            </div>
          )}

          {/* MOTHER AIRCRAFT indicator */}
          {motherAircraftInfo.isMotherAc && (
            <div className="text-white font-extrabold mb-0.5 text-sm">
              MOTHER AIRCRAFT
            </div>
          )}

          {/* POSITION section */}
          {motherAircraftInfo.latitude !== undefined && motherAircraftInfo.longitude !== undefined && (
            <div className="mt-1">
              <div className="text-white font-extrabold mb-0.5 text-sm">
                POSITION:
              </div>
              <div className="text-white leading-snug text-sm ml-0.5 font-bold">
                <div>
                  Lat:{' '}
                  <span className="text-white font-extrabold">
                    {motherAircraftInfo.latitude.toFixed(5)}°
                  </span>
                </div>
                <div>
                  Lng:{' '}
                  <span className="text-white font-extrabold">
                    {motherAircraftInfo.longitude.toFixed(5)}°
                  </span>
                </div>
                {motherAircraftInfo.altitude !== undefined && (
                  <div>
                    Alt:{' '}
                    <span className="text-white font-extrabold">
                      {motherAircraftInfo.altitude}ft
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* META section */}
          {(motherAircraftInfo.baroAltitude !== undefined ||
            motherAircraftInfo.groundSpeed !== undefined ||
            motherAircraftInfo.mach !== undefined) && (
            <div className="mt-1">
              <div className="text-white font-extrabold mb-0.5 text-sm">
                META:
              </div>
              <div className="text-white leading-snug text-sm ml-0.5 font-bold">
                {motherAircraftInfo.baroAltitude !== undefined && (
                  <div>
                    BA:{' '}
                    <span className="text-white font-extrabold">
                      {motherAircraftInfo.baroAltitude}
                    </span>
                  </div>
                )}
                {motherAircraftInfo.groundSpeed !== undefined && (
                  <div>
                    GS:{' '}
                    <span className="text-white font-extrabold">
                      {motherAircraftInfo.groundSpeed}
                    </span>
                  </div>
                )}
                {motherAircraftInfo.mach !== undefined && (
                  <div>
                    M:{' '}
                    <span className="text-white font-extrabold">
                      {motherAircraftInfo.mach}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map for coordinate system - visible but with transparent tiles so deck.gl layers render */}
      <div className="absolute inset-0 w-full h-full z-0">
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
          onLoad={() => {
            // Ensure map is ready for deck.gl layers
            const map = mapRef.current?.getMap();
            if (map) {
              requestAnimationFrame(() => {
                if (map.loaded()) {
                  map.triggerRepaint();
                }
              });
            }
          }}
          onResize={() => {
            // Trigger repaint on resize to fix rendering issues
            const map = mapRef.current?.getMap();
            if (map && map.loaded()) {
              requestAnimationFrame(() => {
                map.triggerRepaint();
              });
            }
          }}
          onIdle={() => {
            // Trigger repaint when map is idle to ensure layers render
            const map = mapRef.current?.getMap();
            if (map && map.loaded()) {
              map.triggerRepaint();
            }
          }}
          onError={(e: any) => {
            // Suppress tile loading errors
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
          <DeckGLOverlay layers={udpLayers} />
        </Map>
      </div>
      
      {/* Compass overlay - fixed size, centered on container when map off, on mother aircraft when map on */}
      {motherAircraft && (
        <CompassOverlay 
          heading={motherAircraftHeading} 
          mapRef={mapRef}
          motherAircraft={motherAircraft}
          isMapOff={true}
          containerRef={containerRef}
        />
      )}
    </div>
  );
}
