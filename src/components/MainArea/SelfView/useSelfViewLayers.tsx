import { useMemo } from 'react';
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { UDPDataPoint } from '../../../utils/types/udp';

interface UseSelfViewLayersProps {
  nodes: Map<number, UDPDataPoint>;
  visible: boolean;
}

// Check if a node is a mother aircraft (from opcode 102)
function isMotherAircraft(point: UDPDataPoint): boolean {
  return point.globalId === 10 || point.internalData?.isMotherAc === 1;
}

export function useSelfViewLayers({ nodes, visible }: UseSelfViewLayersProps): any[] {
  const layers = useMemo(() => {
    if (!visible || nodes.size === 0) {
      return [];
    }

    // Filter to only mother aircraft (isMotherAc == 1 from opcode 102)
    const motherAircraftData: any[] = [];

    Array.from(nodes.values())
      .filter((point) => {
        // Only include if it has position data AND is mother aircraft
        return (
          point.latitude !== undefined &&
          point.longitude !== undefined &&
          isMotherAircraft(point)
        );
      })
      .forEach((point) => {
        const nodeData = {
          position: [point.longitude!, point.latitude!] as [number, number],
          globalId: point.globalId,
          // Use trueHeading from opcode 101, fallback to heading, default 0
          heading: point.trueHeading ?? point.heading ?? 0,
        };

        motherAircraftData.push(nodeData);
      });

    // If no mother aircraft found, return empty layers
    if (motherAircraftData.length === 0) {
      return [];
    }

    // Golden glow layer for mother aircraft (behind icon)
    const motherAircraftGlowLayer = new ScatterplotLayer({
      id: 'self-mother-aircraft-glow-layer',
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
    });

    // Mother aircraft icon layer - rotates based on trueHeading
    const iconSize = 32;
    const motherAircraftLayer = new IconLayer({
      id: 'self-mother-aircraft-layer',
      data: motherAircraftData,
      pickable: true,
      getIcon: () => ({
        url: 'icons/mother-aircraft.svg',
        width: iconSize,
        height: iconSize,
        anchorY: iconSize / 2, // Center anchor
        anchorX: iconSize / 2,
        mask: false,
      }),
      getPosition: (d: any) => d.position,
      getSize: iconSize,
      // Flip the angle to match pin direction (opposite of current calculation)
      // Pin rotates with heading (0° = north, clockwise)
      // Icon needs to point in same direction as pin
      // Negate the heading to flip the rotation direction
      getAngle: (d: any) => {
        const heading = d.heading ?? 0;
        // Normalize to 0-360 first
        let normalized = heading;
        while (normalized < 0) normalized += 360;
        while (normalized >= 360) normalized -= 360;
        // Negate to flip direction (opposite)
        let angle = -normalized;
        // Normalize result to 0-360
        while (angle < 0) angle += 360;
        return angle;
      },
      sizeScale: 1,
      getPixelOffset: [0, 0],
      alphaCutoff: 0.001,
      billboard: true,
      sizeUnits: 'pixels',
      sizeMinPixels: 20,
      sizeMaxPixels: 64,
      updateTriggers: {
        getIcon: 'icons/mother-aircraft.svg',
        getAngle: motherAircraftData.map(d => d.heading).join(','),
        data: motherAircraftData.length,
      },
      onError: (error: any) => {
        // Suppress image loading errors
        if (
          error?.message?.includes('SVG') ||
          error?.message?.includes('Could not load image') ||
          error?.message?.includes('could not be decoded') ||
          error?.message?.includes('InvalidStateError')
        ) {
          console.warn('[IconLayer] Icon load warning for self-mother-aircraft-layer:', 'icons/mother-aircraft.svg');
          return;
        }
        console.error('[IconLayer] Error in self-mother-aircraft-layer:', error);
      },
    });

    // Return layers in order: glow -> mother icon
    return [motherAircraftGlowLayer, motherAircraftLayer];
  }, [nodes, visible]);

  return layers;
}

