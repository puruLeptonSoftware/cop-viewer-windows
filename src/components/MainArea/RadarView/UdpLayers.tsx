import { useMemo } from 'react';
import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { UDPDataPoint, ThreatData } from '../../../utils/types/udp';
import type { TargetData } from '../../../utils/hooks/useGetTargets';
import type { RadarFilter } from '../../shared/RadarFilterBar';

interface UdpLayersProps {
  nodes: Map<number, UDPDataPoint>;
  targets?: TargetData[];
  threats?: ThreatData[];
  visible: boolean;
  filter?: RadarFilter;
}

// Helper function to calculate threat position from mother aircraft
function calculateThreatPosition(
  motherLat: number,
  motherLng: number,
  range: number, // Distance in meters
  azimuth: number // Angle from true north in degrees (0 = North, clockwise)
): { latitude: number; longitude: number } {
  // Earth's radius in meters
  const R = 6371000;
  
  // Convert to radians
  const lat1Rad = (motherLat * Math.PI) / 180;
  const lng1Rad = (motherLng * Math.PI) / 180;
  
  // Convert azimuth to radians (0° = North, clockwise)
  // In math, 0° is typically East, so we need to adjust: subtract 90° to make 0° = North
  const bearingRad = ((azimuth - 90) * Math.PI) / 180;
  
  // Calculate angular distance
  const angularDistance = range / R;
  
  // Calculate new latitude
  const newLatRad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDistance) +
    Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  
  // Calculate new longitude
  const newLngRad = lng1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
    Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(newLatRad)
  );
  
  // Convert back to degrees
  const newLat = (newLatRad * 180) / Math.PI;
  const newLng = (newLngRad * 180) / Math.PI;
  
  return { latitude: newLat, longitude: newLng };
}

// Check if a node is a mother aircraft
// Only treat as mother aircraft if isMotherAc is explicitly 1 (from opcode 102)
function isMotherAircraft(point: UDPDataPoint): boolean {
  return point.internalData?.isMotherAc === 1;
}

export function useUdpLayers({ nodes, targets = [], threats = [], visible, filter = 'all' }: UdpLayersProps): any[] {
  const layers = useMemo(() => {
    if (!visible) {
      return [];
    }

    const motherAircraftData: any[] = [];
    const networkMemberData: any[] = [];

    Array.from(nodes.values())
      .filter((point) => {
        return point.latitude !== undefined && point.longitude !== undefined;
      })
      .forEach((point) => {
        const nodeData = {
          position: [point.longitude!, point.latitude!] as [number, number],
          globalId: point.globalId,
          heading: point.trueHeading ?? point.heading ?? 0, // Use trueHeading, fallback to heading, default 0
        };

        if (isMotherAircraft(point)) {
          motherAircraftData.push(nodeData);
        } else {
          // Only add to networkMemberData if filter is not 'network-members' OR if it is 'network-members' (will be filtered later)
          networkMemberData.push(nodeData);
        }
      });

    // Helper function to create IconLayer - use separate layers per icon type
    const createIconLayer = (
      nodeData: any[],
      iconUrl: string,
      layerId: string,
      anchorAtCenter: boolean = false
    ): any | null => {
      if (nodeData.length === 0) return null;

      const iconSize = 32;
      const anchorY = anchorAtCenter ? iconSize / 2 : iconSize;
      const anchorX = iconSize / 2;

      return new IconLayer({
        id: layerId,
        data: nodeData,
        pickable: true,
        getIcon: () => ({
          url: iconUrl,
          width: iconSize,
          height: iconSize,
          anchorY: anchorY,
          anchorX: anchorX,
          mask: false,
        }),
        getPosition: (d: any) => d.position,
        getSize: iconSize,
        // Rotate icons based on trueHeading
        // getAngle: (d: any) => {
        //   const heading = d.heading ?? 0;
        //   // Normalize to 0-360 first
        //   let normalized = heading;
        //   while (normalized < 0) normalized += 360;
        //   while (normalized >= 360) normalized -= 360;
        //   // Negate to flip direction (opposite) - same as self screen
        //   let angle = -normalized;
        //   // Normalize result to 0-360
        //   while (angle < 0) angle += 360;
        //   return angle;
        // },
        sizeScale: 1,
        getPixelOffset: [0, 0],
        alphaCutoff: 0.001,
        billboard: false, // Set to false to allow rotation
        sizeUnits: 'pixels',
        sizeMinPixels: 20,
        sizeMaxPixels: 64,
        updateTriggers: {
          getIcon: iconUrl,
          getAngle: nodeData.map(d => d.heading).join(','), // Include heading in update triggers
          data: nodeData.length,
        },
        onError: (error: any) => {
          // Suppress image loading errors
          if (
            error?.message?.includes('SVG') ||
            error?.message?.includes('Could not load image') ||
            error?.message?.includes('could not be decoded') ||
            error?.message?.includes('InvalidStateError')
          ) {
            console.warn(`[IconLayer] Icon load warning for ${layerId}:`, iconUrl);
            return;
          }
          console.error(`[IconLayer] Error in ${layerId}:`, error);
        },
      });
    };

    // Golden glow layer for mother aircraft (behind icon)
    const motherAircraftGlowLayer = motherAircraftData.length > 0 ? new ScatterplotLayer({
      id: 'mother-aircraft-glow-layer',
      data: motherAircraftData,
      pickable: false,
      opacity: 0.7,
      filled: true,
      stroked: false,
      radiusUnits: 'pixels',
      radiusScale: 1,
      radiusMinPixels: 14,
      radiusMaxPixels: 24,
      getPosition: (d: any) => d.position,
      getRadius: () => 18,
      getFillColor: () => [255, 215, 0, 180], // Golden color (RGB: 255, 215, 0) with alpha
    }) : null;

    // Create separate layers for each icon type
    const motherAircraftLayer = createIconLayer(
      motherAircraftData,
      'icons/mother-aircraft.svg',
      'mother-aircraft-layer',
      true
    );

    // Use SVG for friendly aircraft
    const networkMemberLayer = createIconLayer(
      networkMemberData,
      'icons/friendly_aircraft.svg',
      'network-member-layer',
      false
    );

    // Return layers in order: network members -> targets -> threats -> mother node (on top)
    const orderedLayers: any[] = [];

    // Apply filter logic
    // When 'network-members' is selected, explicitly exclude mother node
    const showMotherNode = filter === 'all' || filter === 'mother-node' || filter === 'network-members';
    const showNetworkMembers = filter === 'all' || filter === 'network-members';
    const showTargets = filter === 'all' || filter === 'targets';
    const showThreats = filter === 'all' || filter === 'threats';

    // Network members layer - only show when network-members filter is active (excludes mother node)
    if (showNetworkMembers && networkMemberLayer) {
      orderedLayers.push(networkMemberLayer);
    }
    
    // Add text labels for network members (Global ID) - above icons, rendered after icon layer
    if (showNetworkMembers && networkMemberData.length > 0) {
      const networkMemberTextLayer = new TextLayer({
        id: 'network-member-text-layer',
        data: networkMemberData,
        pickable: false,
        getPosition: (d: any) => d.position,
          getText: (d: any) => `ID${d.globalId}`,
        getSize: 16,
        getColor: [0, 240, 255, 255], // White text for better visibility
        getAngle: 0, // No rotation - always horizontal
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        sizeScale: 1.2,
        sizeUnits: 'pixels',
        billboard: true, // Always face camera
        getPixelOffset: [0, -28], // Offset above icon (20 pixels up)
        outlineColor: [0, 0, 0, 255], // Bright blue border (RGB: 0, 191, 255 - dodger blue)
        outlineWidth: 10, // Thicker border for better visibility
        fontWeight: 'bold',
        updateTriggers: {
          getText: networkMemberData.map(d => d.globalId).join(','),
          data: networkMemberData.length,
        },
      });
      orderedLayers.push(networkMemberTextLayer);
    }

    // Add targets layer (opcode 104) - using hostile aircraft icon
    if (showTargets && targets.length > 0) {
      const targetData = targets
        .filter((target) => target.latitude !== undefined && target.longitude !== undefined)
        .map((target) => ({
          position: [target.longitude, target.latitude] as [number, number],
          globalId: target.globalId,
          range: target.range,
        }));

      if (targetData.length > 0) {
        const targetLayer = createIconLayer(
          targetData,
          'icons/hostile_aircraft.svg',
          'target-layer',
          false
        );
        if (targetLayer) {
          orderedLayers.push(targetLayer);
        }
      }
    }

    // Add threats layer (opcode 106) - calculate positions from mother aircraft
    if (showThreats && threats.length > 0) {
      // Get mother aircraft position
      // Only treat as mother aircraft if isMotherAc === 1 (from opcode 102)
      const motherAircraft = Array.from(nodes.values()).find(
        (node) => node.internalData?.isMotherAc === 1
      );

      if (motherAircraft && 
          motherAircraft.latitude !== undefined && 
          motherAircraft.longitude !== undefined &&
          Number.isFinite(motherAircraft.latitude) &&
          Number.isFinite(motherAircraft.longitude)) {
        
        const threatData = threats
          .map((threat) => {
            // Calculate threat position from mother aircraft
            const position = calculateThreatPosition(
              motherAircraft.latitude!,
              motherAircraft.longitude!,
              threat.threatRange, // meters
              threat.threatAzimuth // degrees from true north
            );
            
            // Validate calculated position
            if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) {
              console.warn(`[Threat] Invalid position calculated for threat ${threat.threatId}:`, {
                motherLat: motherAircraft.latitude,
                motherLng: motherAircraft.longitude,
                range: threat.threatRange,
                azimuth: threat.threatAzimuth,
                calculated: position
              });
              return null;
            }
            
            return {
              position: [position.longitude, position.latitude] as [number, number],
              threatId: threat.threatId,
              senderGlobalId: threat.senderGlobalId,
              isSearchMode: threat.isSearchMode,
              isLockOn: threat.isLockOn,
              threatType: threat.threatType,
              threatRange: threat.threatRange,
              threatAzimuth: threat.threatAzimuth,
              threatFrequency: threat.threatFrequency,
            };
          })
          .filter((threat): threat is NonNullable<typeof threat> => 
            threat !== null &&
            threat.position[0] !== undefined && 
            threat.position[1] !== undefined &&
            Number.isFinite(threat.position[0]) &&
            Number.isFinite(threat.position[1])
          );

        if (threatData.length > 0) {
          const threatLayer = createIconLayer(
            threatData,
            'icons/alert.svg',
            'threat-layer',
            false
          );
          if (threatLayer) {
            orderedLayers.push(threatLayer);
          }
        } else if (threats.length > 0) {
          console.warn('[Threat] No valid threat positions calculated:', {
            threatsCount: threats.length,
            motherAircraft: motherAircraft ? {
              lat: motherAircraft.latitude,
              lng: motherAircraft.longitude
            } : null
          });
        }
      } else if (threats.length > 0) {
        console.warn('[Threat] Mother aircraft not found or invalid position:', {
          threatsCount: threats.length,
          nodesCount: nodes.size
        });
      }
    }

    // Mother node layers rendered LAST (highest z-index) - on top of everything
    // Glow layer first (behind icon) - only show when mother node filter is active
    if (showMotherNode && motherAircraftGlowLayer) {
      orderedLayers.push(motherAircraftGlowLayer);
    }

    // Mother aircraft layer - only show when mother node filter is active
    if (showMotherNode && motherAircraftLayer) {
      orderedLayers.push(motherAircraftLayer);
    }
    
    // Add text labels for mother aircraft (Global ID) - above icon, rendered after icon layer
    if (showMotherNode && motherAircraftData.length > 0) {
      const motherAircraftTextLayer = new TextLayer({
        id: 'mother-aircraft-text-layer',
        data: motherAircraftData,
        pickable: false,
        getPosition: (d: any) => d.position,
          getText: (d: any) => `ID${d.globalId}`,
        getSize: 16,
        getColor: [0, 240, 255, 255], // White text for better visibility
        getAngle: 0, // No rotation - always horizontal
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        sizeScale: 1.2,
        sizeUnits: 'pixels',
        billboard: true, // Always face camera
        getPixelOffset: [0, -20], // Offset above icon (20 pixels up)
        outlineColor: [0, 0, 0, 255], // Bright blue border (RGB: 0, 191, 255 - dodger blue)
        outlineWidth: 10, // Thicker border for better visibility
        fontWeight: 'bold',
        updateTriggers: {
          getText: motherAircraftData.map(d => d.globalId).join(','),
          data: motherAircraftData.length,
        },
      });
      orderedLayers.push(motherAircraftTextLayer);
    }

    return orderedLayers;
  }, [nodes, targets, threats, visible, filter]);

  return layers;
}
