import { useMemo } from 'react';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';
import { useMap } from '../../../contexts/MapContext';
import type { UDPDataPoint } from '../../../utils/types/udp';

// Get mother aircraft node
const getMotherNode = (nodes: Map<number, UDPDataPoint>): UDPDataPoint | undefined => {
  return Array.from(nodes.values()).find(
    (node) => node.globalId === 10 || node.internalData?.isMotherAc === 1
  );
};

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
    const motherNode = getMotherNode(nodes);
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

// Top Section Component
const TopSection = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'clamp(8px, 1.5vh, 15px)',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 clamp(40px, 8vw, 120px)',
        fontSize: 'clamp(8px, 1.1vw, 11px)',
        fontWeight: 700,
        fontFamily: 'Arial, sans-serif',
        textShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 30 }}>
        <span>MCP SPD</span>
        <span>VOR/LOC 5</span>
        <span>G/S</span>
        <span>FD</span>
      </div>
    </div>
  );
};

// Airspeed Tape Component
const AirspeedTape = ({
  groundSpeed,
  metadata,
}: {
  groundSpeed: number;
  metadata: { groundSpeed?: number };
}) => {
  const currentSpeed =
    metadata.groundSpeed !== undefined
      ? Math.round(metadata.groundSpeed)
      : typeof groundSpeed === 'number'
        ? Math.round(groundSpeed)
        : null;
  
  if (currentSpeed == null) return null;

  const speedStep = 10;
  const numValues = 12;
  const centerValue = Math.round(currentSpeed / speedStep) * speedStep;
  const speeds: number[] = [];
  for (let i = -numValues / 2; i <= numValues / 2; i++) {
    speeds.push(centerValue + i * speedStep);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 'clamp(8px, 1.5vw, 15px)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'clamp(50px, 7vw, 70px)',
        height: 'clamp(300px, 50vh, 500px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontSize: 'clamp(10px, 1.3vw, 13px)',
        fontWeight: 700,
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.35)',
        fontFamily: 'Arial, sans-serif',
        textShadow: '0 0 3px rgba(0, 0, 0, 0.7)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: '4px 6px',
          boxSizing: 'border-box',
        }}
      >
        {speeds.map((speed) => {
          const diff = speed - currentSpeed;
          const yPos = 50 + (diff / speedStep) * 6;
          const isCurrent = Math.abs(speed - currentSpeed) < 5;
          if (yPos < -10 || yPos > 85 || isCurrent) return null;
          return (
            <div
              key={speed}
              style={{
                position: 'absolute',
                top: `${yPos}%`,
                left: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                transform: 'translateY(-50%)',
              }}
            >
              <div
                style={{
                  width: 'clamp(15px, 2vw, 20px)',
                  height: 1,
                  background: '#ffffff',
                  marginRight: 'clamp(3px, 0.5vw, 5px)',
                  marginLeft: 'clamp(4px, 0.6vw, 6px)',
                }}
              />
              <span>{speed >= 0 ? speed : 0}</span>
            </div>
          );
        })}
        <div
          className="absolute left-0 right-0 top-1/2 z-[3] flex -translate-y-1/2 items-center gap-2 text-[#f5c542]"
          style={{ textShadow: '0 0 6px rgba(245, 197, 66, 0.35)' }}
        >
          <div className="h-[2px] flex-1 bg-[#f5c542]" />
          <div
            className="flex items-center justify-center gap-1 font-bold tracking-[0.06em]"
            style={{ fontSize: 'clamp(12px, 1.4vw, 14px)', minWidth: '3.5ch' }}
          >
            <span>◀</span>
            <span>{currentSpeed >= 0 ? currentSpeed : 0}</span>
            <span>▶</span>
          </div>
          <div className="h-[2px] flex-1 bg-[#f5c542]" />
        </div>
      </div>
    </div>
  );
};

// Altitude Tape Component
const AltitudeTape = ({ altitude }: { altitude: number | undefined }) => {
  if (altitude == null || !Number.isFinite(altitude)) return null;
  
  const currentAlt = Math.round(altitude);
  const altitudeStep = 100;
  const numValues = 10;
  const centerValue = Math.round(currentAlt / altitudeStep) * altitudeStep;
  const altitudes: number[] = [];
  for (let i = -numValues / 2; i <= numValues / 2; i++) {
    altitudes.push(centerValue + i * altitudeStep);
  }
  const decisionAlt = 600;

  return (
    <div
      style={{
        position: 'absolute',
        right: 'clamp(8px, 1.5vw, 15px)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'clamp(50px, 7vw, 70px)',
        height: 'clamp(250px, 40vh, 400px)',
        overflow: 'visible',
        display: 'block',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.35)',
          padding: '4px 6px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            fontSize: 'clamp(8px, 1vw, 10px)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        >
          ALT (FT)
        </div>
        <div style={{ position: 'relative', width: '100%', height: '100%', fontSize: 13, fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
          {altitudes.map((alt) => {
            const diff = alt - currentAlt;
            const yPos = 50 + (diff / altitudeStep) * 8;
            const isCurrent = Math.abs(alt - currentAlt) < 50;
            if (yPos < -10 || yPos > 110) return null;
            if (yPos > 43 && yPos < 57) return null;
            return (
              <div
                key={alt}
                style={{
                  position: 'absolute',
                  top: `${yPos}%`,
                  right: 0,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  transform: 'translateY(-50%)',
                  background: isCurrent ? 'rgba(255, 255, 255, 0.25)' : undefined,
                  border: isCurrent ? '2px solid #ffffff' : undefined,
                  padding: isCurrent ? '2px 0' : undefined,
                  textShadow: '0 0 2px rgba(0, 0, 0, 0.8)',
                  zIndex: 1,
                }}
              >
                <span
                  style={
                    isCurrent
                      ? { fontSize: 'clamp(13px, 1.7vw, 17px)', fontWeight: 700 }
                      : { fontSize: 'clamp(10px, 1.3vw, 13px)' }
                  }
                >
                  {alt >= 0 ? alt : 0}
                </span>
                <div
                  style={{
                    width: isCurrent ? 'clamp(22px, 3vw, 30px)' : 'clamp(15px, 2vw, 20px)',
                    height: isCurrent ? 2 : 1,
                    background: '#ffffff',
                    marginLeft: 'clamp(3px, 0.5vw, 5px)',
                  }}
                />
              </div>
            );
          })}
          <div
            className="absolute left-0 right-0 top-1/2 z-[3] flex -translate-y-1/2 items-center gap-2 text-[#f5c542]"
            style={{ textShadow: '0 0 6px rgba(245, 197, 66, 0.35)' }}
          >
            <div className="h-[2px] flex-1 bg-[#f5c542]" />
            <div
              className="flex items-center justify-center gap-1 font-bold tracking-[0.06em]"
              style={{ fontSize: 'clamp(12px, 1.4vw, 14px)', minWidth: '3.5ch' }}
            >
              <span>◀</span>
              <span>{currentAlt >= 0 ? currentAlt : 0}</span>
              <span>▶</span>
            </div>
            <div className="h-[2px] flex-1 bg-[#f5c542]" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Bottom Left Data Block
const BottomLeftData = ({ data }: { data: any }) => {
  const metadata = data.metadata || {};
  const gsValue =
    metadata.groundSpeed !== undefined
      ? Math.round(metadata.groundSpeed)
      : Math.round(data.groundSpeed);
  const baroAltValue =
    metadata.baroAltitude !== undefined ? Math.round(metadata.baroAltitude) : null;
  const machValue = metadata.mach !== undefined ? metadata.mach.toFixed(3) : null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'clamp(60px, 10vh, 100px)',
        left: 'clamp(10px, 2vw, 20px)',
        fontSize: 'clamp(9px, 1.1vw, 11px)',
        lineHeight: 1.5,
        fontWeight: 700,
        fontFamily: 'Arial, sans-serif',
        textShadow: 'none',
      }}
    >
      <div>GS {gsValue}</div>
      <div>DME {data.dme.toFixed(1)}</div>
      {typeof data.heading === 'number' && <div>HDG {Math.round(data.heading)}</div>}
      {typeof data.course === 'number' && <div>CRS {Math.round(data.course)}</div>}
      <div>ILS1</div>
      {baroAltValue !== null && <div>BARO {baroAltValue}</div>}
      {machValue !== null && <div>MACH {machValue}</div>}
    </div>
  );
};

// Bottom Right Data Block
const BottomRightData = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'clamp(60px, 10vh, 100px)',
        right: 'clamp(10px, 2vw, 20px)',
        fontSize: 'clamp(9px, 1.1vw, 11px)',
        lineHeight: 1.5,
        fontWeight: 700,
        textAlign: 'right',
        fontFamily: 'Arial, sans-serif',
        textShadow: 'none',
      }}
    >
      <div>
        {data.verticalSpeed < 0 ? '-' : '+'}
        {Math.abs(data.verticalSpeed)} VS
      </div>
      <div>30.22 IN</div>
    </div>
  );
};

// Compass Rose Component
const CompassRose = ({ heading }: { heading: number | undefined }) => {
  // Normalize heading to 0-360 range (same as RadarView)
  let normalizedHeading = typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;
  while (normalizedHeading < 0) normalizedHeading += 360;
  while (normalizedHeading >= 360) normalizedHeading -= 360;
  const bearing = normalizedHeading;
  const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.12;
  const radius = Math.min(100, Math.max(70, baseRadius));
  const size = radius * 2 + Math.min(50, radius * 0.4);
  const compassSize = Math.min(
    size,
    Math.max(160, Math.min(window.innerWidth, window.innerHeight) * 0.22)
  );

  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'clamp(50px, 8vh, 80px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: `clamp(140px, 20vw, ${compassSize}px)`,
        height: `clamp(140px, 20vw, ${compassSize}px)`,
        pointerEvents: 'none',
        zIndex: 1001,
        transformOrigin: 'center center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {/* Outer compass circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke="#ffffff"
          strokeWidth="2"
          fill="none"
          opacity="0.95"
        />

        {/* Tick marks every 10° */}
        {Array.from({ length: 36 }, (_, i) => {
          const deg = i * 10;
          const angleRad = ((deg - 90) * Math.PI) / 180;
          const isMajor = deg % 30 === 0;
          const tickOuter = radius;
          const tickInner = radius - (isMajor ? 12 : 6);

          const x1 = centerX + Math.cos(angleRad) * tickOuter;
          const y1 = centerY + Math.sin(angleRad) * tickOuter;
          const x2 = centerX + Math.cos(angleRad) * tickInner;
          const y2 = centerY + Math.sin(angleRad) * tickInner;

          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#ffffff"
              strokeWidth={isMajor ? 2 : 1.5}
              opacity={isMajor ? 1 : 0.85}
            />
          );
        })}

        {/* Lubber line */}
        <line
          x1={centerX}
          y1={centerY - radius}
          x2={centerX}
          y2={centerY - radius + 25}
          stroke="#ffff00"
          strokeWidth="3"
        />

        {/* Inner dashed range circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.7}
          stroke="rgba(0,255,255,0.75)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="6 4"
        />
      </svg>

      {/* Rotating pin */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          transform: `rotate(${bearing}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${centerY - radius * 0.6}px`,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '14px solid #ffff00',
            filter: 'drop-shadow(0 0 4px rgba(255, 255, 0, 0.6))',
          }}
        />
      </div>

      {/* Mother aircraft icon at center - rotates with heading */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${bearing}deg)`,
          width: 'clamp(24px, 3vw, 32px)',
          height: 'clamp(24px, 3vw, 32px)',
          pointerEvents: 'none',
          zIndex: 1002,
        }}
      >
        {/* Golden radial gradient background circle */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(28px, 3.5vw, 36px)',
            height: 'clamp(28px, 3.5vw, 36px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(255,165,0,0.7) 30%, rgba(255,140,0,0.4) 60%, rgba(255,140,0,0.1) 100%)',
            boxShadow: '0 0 12px rgba(255,215,0,0.8), 0 0 24px rgba(255,165,0,0.6), 0 0 36px rgba(255,140,0,0.4), inset 0 0 8px rgba(255,215,0,0.5)',
            zIndex: 1,
          }}
        />
        {/* Mother aircraft icon */}
        <img
          src="icons/mother-aircraft.svg"
          alt="Mother Aircraft"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.9)) drop-shadow(0 0 16px rgba(255,165,0,0.7))',
            zIndex: 2,
          }}
        />
      </div>

      {/* Heading display */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(-30px, -4vh, -35px)',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffff00',
          fontFamily: 'Arial, sans-serif',
          fontSize: 'clamp(18px, 2.5vw, 24px)',
          fontWeight: 700,
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: 'clamp(5px, 1vh, 8px) clamp(12px, 2.5vw, 18px)',
          borderRadius: 4,
          border: '2px solid #ffff00',
          zIndex: 1002,
        }}
      >
        {Math.round(bearing)}°
      </div>
    </div>
  );
};

// Status Indicators Component
const StatusIndicators = ({ data }: { data: any }) => {
  const bgd = data.battleGroupData || {};

  const getACSColor = (status: number): string => {
    if (status === 0) return 'rgba(100, 100, 100, 0.5)';
    if (status === 1) return 'rgba(255, 255, 255, 0.6)';
    if (status === 2) return 'rgba(255, 255, 0, 0.6)';
    return 'rgba(255, 0, 0, 0.6)';
  };

  const getACSTextColor = (status: number): string => {
    if (status === 0) return '#888';
    if (status === 1) return '#000';
    if (status === 2) return '#000';
    return '#fff';
  };

  const getFuelColor = (fuel: number): string => {
    if (fuel > 50) return 'rgba(255, 255, 255, 0.6)';
    if (fuel > 25) return 'rgba(255, 255, 0, 0.6)';
    return 'rgba(255, 0, 0, 0.6)';
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'clamp(15px, 2vh, 20px)',
        right: 'clamp(10px, 2vw, 20px)',
        fontSize: 'clamp(8px, 1vw, 10px)',
        lineHeight: 1.6,
        fontWeight: 700,
        textAlign: 'right',
        textShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(3px, 0.4vh, 4px)',
      }}
    >
      {bgd.combatEmergency !== undefined && (
        <div
          style={{
            color: bgd.combatEmergency ? '#ff0000' : '#ffffff',
            animation: bgd.combatEmergency ? 'hud-blink 1s infinite' : undefined,
          }}
        >
          {bgd.combatEmergency ? 'EMERG' : 'OK'}
        </div>
      )}
      {bgd.masterArmStatus !== undefined && (
        <div style={{ color: bgd.masterArmStatus ? '#ff4400' : '#888888' }}>
          ARM {bgd.masterArmStatus ? 'ARM' : 'SAFE'}
        </div>
      )}
      {bgd.acsStatus !== undefined && (
        <div
          style={{
            color: getACSTextColor(bgd.acsStatus),
            background: getACSColor(bgd.acsStatus),
            padding: '2px 6px',
            borderRadius: 3,
            display: 'inline-block',
          }}
        >
          ACS {bgd.acsStatus}
        </div>
      )}
      {bgd.fuel !== undefined && (
        <div
          style={{
            color: '#000',
            background: getFuelColor(bgd.fuel),
            padding: '2px 6px',
            borderRadius: 3,
            display: 'inline-block',
            marginTop: 2,
          }}
        >
          FUEL {bgd.fuel.toFixed(0)}
        </div>
      )}
      {bgd.chaffRemaining !== undefined && <div>CHAFF {bgd.chaffRemaining}</div>}
      {bgd.flareRemaining !== undefined && <div>FLARE {bgd.flareRemaining}</div>}
    </div>
  );
};

// Main Altitude/HUD View Component
export function Altitude() {
  const { nodes } = useGetNetworkMembers();
  const { center } = useMap();
  const data = useFlightData(nodes, center.radar);

  if (!data) {
    return (
      <div
        className="w-full h-full"
        style={{
          background: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: 'clamp(14px, 1.8vw, 18px)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        No Mother Aircraft Data Available
      </div>
    );
  }

  return (
    <div
      className="w-full h-full"
      style={{
        position: 'relative',
        background: '#1a1a2e',
        overflow: 'hidden',
        fontFamily: "'Courier New', monospace",
        color: '#ffffff',
      }}
    >
      <style>{`
        @keyframes hud-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.25; }
        }
      `}</style>

      <TopSection />
      <AirspeedTape groundSpeed={data.groundSpeed} metadata={data.metadata} />
      <AltitudeTape altitude={data.altitude} />
      <BottomLeftData data={data} />
      <BottomRightData data={data} />
      <StatusIndicators data={data} />
      <CompassRose heading={data.heading} />
    </div>
  );
}
