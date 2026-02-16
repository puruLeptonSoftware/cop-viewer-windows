import React, { useRef, useMemo, useEffect, useState } from 'react';
import Map, { useControl } from 'react-map-gl/mapbox';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useMap } from '../../../contexts/MapContext';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';
import { useSelfViewLayers } from './useSelfViewLayers';
import type { UDPDataPoint } from '../../../utils/types/udp';
import { Tape } from '../../shared/Tape';
import { MotherAircraftInfoPanel } from '../../shared/MotherAircraftInfoPanel';
import { StatusIndicators } from '../../shared/StatusIndicators';
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
        transform: 'scale(0.8)',
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

// Calculate bearing between two lat/lng points
const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
};

// Extract flight data from mother aircraft
const useFlightData = (nodes: Map<number, UDPDataPoint>, mapCenter: [number, number]) => {
  return useMemo(() => {
    const motherNode = Array.from(nodes.values()).find(
      (node) => node.internalData?.isMotherAc === 1
    );
    if (!motherNode) {
      return null;
    }

    const data: {
      airspeed: number;
      groundSpeed: number;
      altitude: number | undefined;
      radioAltitude: number;
      heading: number | undefined;
      course: number | undefined;
      verticalSpeed: number;
      dme: number;
      pitch: number;
      roll: number;
      bearing: number;
      metadata: {
        baroAltitude?: number;
        groundSpeed?: number;
        mach?: number;
      };
      battleGroupData?: {
        combatEmergency?: number;
        chaffRemaining?: number;
        flareRemaining?: number;
        masterArmStatus?: number;
        acsStatus?: number;
        fuel?: number;
      };
    } = {
      airspeed: 148,
      groundSpeed: 150,
      altitude: undefined,
      radioAltitude: 0,
      heading: undefined,
      course: undefined,
      verticalSpeed: -700,
      dme: 3.7,
      pitch: 2.8,
      roll: 0,
      bearing: 0,
      metadata: {},
    };

    // Get lat/lng for bearing calculation
    if (
      typeof motherNode.latitude === 'number' &&
      typeof motherNode.longitude === 'number' &&
      Number.isFinite(motherNode.latitude) &&
      Number.isFinite(motherNode.longitude)
    ) {
      data.bearing = calculateBearing(mapCenter[1], mapCenter[0], motherNode.latitude, motherNode.longitude);
    }

    // Get metadata from regionalData
    if (motherNode.regionalData?.metadata) {
      data.metadata = {
        baroAltitude: motherNode.regionalData.metadata.baroAltitude,
        groundSpeed: motherNode.regionalData.metadata.groundSpeed,
        mach: motherNode.regionalData.metadata.mach,
      };

      if (motherNode.regionalData.metadata.baroAltitude !== undefined) {
        data.altitude = motherNode.regionalData.metadata.baroAltitude;
      } else if (motherNode.altitude !== undefined) {
        data.altitude = motherNode.altitude;
      }

      if (motherNode.regionalData.metadata.groundSpeed !== undefined) {
        data.groundSpeed = motherNode.regionalData.metadata.groundSpeed;
      }
    } else if (motherNode.altitude !== undefined) {
      data.altitude = motherNode.altitude;
    }

    // Get heading - normalize to 0-360 range (same as RadarView)
    if (typeof motherNode.trueHeading === 'number' && Number.isFinite(motherNode.trueHeading)) {
      let normalizedHeading = motherNode.trueHeading;
      while (normalizedHeading < 0) normalizedHeading += 360;
      while (normalizedHeading >= 360) normalizedHeading -= 360;
      data.heading = normalizedHeading;
      data.course = (normalizedHeading + 9) % 360;
    } else if (typeof motherNode.heading === 'number' && Number.isFinite(motherNode.heading)) {
      let normalizedHeading = motherNode.heading;
      while (normalizedHeading < 0) normalizedHeading += 360;
      while (normalizedHeading >= 360) normalizedHeading -= 360;
      data.heading = normalizedHeading;
      data.course = (normalizedHeading + 9) % 360;
    }

    // Calculate radio altitude
    if (typeof data.altitude === 'number') {
      data.radioAltitude = Math.max(0, data.altitude - 20);
    }

    // Get battle group data
    if (motherNode.battleGroupData) {
      data.battleGroupData = {
        combatEmergency: motherNode.battleGroupData.combatEmergency,
        chaffRemaining: motherNode.battleGroupData.chaffRemaining,
        flareRemaining: motherNode.battleGroupData.flareRemaining,
        masterArmStatus: motherNode.battleGroupData.masterArmStatus,
        acsStatus: motherNode.battleGroupData.acsStatus,
        fuel: motherNode.battleGroupData.fuel,
      };
    }

    return data;
  }, [nodes, mapCenter]);
};

// Top Section Component - Removed (static values)


// Combined Mother Aircraft Info Panel - Now includes flight data

// Bottom Right Data Block
// Bottom Right Data Block - Now integrated into FlightDataPanel


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

  // Get flight data for altitude screen features
  const flightData = useFlightData(nodes, currentCenter);

  // Get mother aircraft data (from opcode 102 where isMotherAc == 1)
  // Only treat as mother aircraft if isMotherAc === 1 (from opcode 102)
  const motherAircraft = useMemo(() => {
    return Array.from(nodes.values()).find(
      (node) => node.internalData?.isMotherAc === 1
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

  // Debounce showing "No mother aircraft" overlay to prevent flickering during transitions
  const [showNoMotherAircraftOverlay, setShowNoMotherAircraftOverlay] = useState(false);
  
  useEffect(() => {
    // Only show overlay in self-only mode and when map is off
    if (viewMode !== 'self-only' || isMapVisible) {
      setShowNoMotherAircraftOverlay(false);
      return;
    }

    if (!motherAircraft) {
      // Delay showing overlay to prevent flickering during transitions
      const timer = setTimeout(() => {
        setShowNoMotherAircraftOverlay(true);
      }, 500); // 500ms delay

      return () => clearTimeout(timer);
    } else {
      // Hide immediately when mother aircraft appears
      setShowNoMotherAircraftOverlay(false);
    }
  }, [motherAircraft, viewMode, isMapVisible]);

  // Calculate mother aircraft info for display
  const motherAircraftInfo = useMemo(() => {
    if (!motherAircraft) return null;

    const metadata = motherAircraft.regionalData?.metadata || {};
    const baroAltitude = metadata.baroAltitude;
    const groundSpeed = metadata.groundSpeed;
    const mach = metadata.mach;
    
    // Use same altitude logic as tape: baroAltitude first, then fallback to altitude
    const finalAltitude = baroAltitude !== undefined ? baroAltitude : motherAircraft.altitude;
    const finalGroundSpeed = groundSpeed;
    const finalMach = mach;
    
    const callsign = motherAircraft.callsign || null;
    const callsignId = motherAircraft.callsignId;
    const isMotherAc = motherAircraft.internalData?.isMotherAc === 1;

    return {
      globalId: motherAircraft.globalId,
      callsign,
      callsignId,
      isMotherAc,
      latitude: motherAircraft.latitude,
      longitude: motherAircraft.longitude,
      altitude: finalAltitude, // Use same logic as tape
      baroAltitude,
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
      <style>{`
        @keyframes hud-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.25; }
        }
      `}</style>

      {/* Altitude Screen Features */}
      {flightData && (
        <>
          <Tape
            label="Speed"
            currentValue={
              flightData.metadata?.groundSpeed !== undefined
                ? Math.round(flightData.metadata.groundSpeed)
                : typeof flightData.groundSpeed === 'number'
                  ? Math.round(flightData.groundSpeed)
                  : null
            }
            step={10}
            numValues={12}
            position="left"
          />
          <Tape
            label="ALT (FT)"
            currentValue={flightData.altitude !== undefined ? Math.round(flightData.altitude) : null}
            step={100}
            numValues={10}
            position="right"
          />
          <StatusIndicators
            data={flightData}
            className="fixed top-[15px] right-[170px] z-[1000] pointer-events-none"
          />
        </>
      )}

      {/* Combined Mother Aircraft Info Panel - Top Left */}
      {motherAircraftInfo && flightData && (
        <MotherAircraftInfoPanel
          motherAircraftInfo={motherAircraftInfo}
          flightData={flightData}
          className="fixed top-[15px] left-[15px] z-[1000] pointer-events-none"
        />
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
      
      {/* Translucent overlay when no mother aircraft (debounced to prevent flickering) */}
      {showNoMotherAircraftOverlay && (
        <div
          className="absolute inset-0 w-full h-full z-[1001] flex items-center justify-center pointer-events-none"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            className="text-white font-bold text-4xl"
            style={{
              textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.9)',
              letterSpacing: '2px',
            }}
          >
            No mother aircraft
          </div>
        </div>
      )}
      
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
