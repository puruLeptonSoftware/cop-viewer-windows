import { useMemo, useState, useEffect, useRef } from 'react';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';

const formatLegacyFreq = (freq: any): string | null => {
  if (!freq || typeof freq !== 'object') return null;
  const digits = [
    freq.D1, freq.D2, freq.D3, freq.D4, 
    freq.D5, freq.D6, freq.D7, freq.D8
  ].map((v) => (v !== undefined && v !== null ? v : 0));
  if (digits.every((d) => d === 0)) return null;
  return digits.join('.');
};

const getACSColor = (status: number) => {
  if (status === 0) return 'rgba(100, 100, 100, 0.5)';
  if (status === 1) return 'rgba(0, 255, 0, 0.6)';
  if (status === 2) return 'rgba(255, 255, 0, 0.6)';
  return 'rgba(255, 0, 0, 0.6)';
};

const getACSTextColor = (status: number) => {
  if (status === 0) return '#888';
  if (status === 1) return '#000';
  if (status === 2) return '#000';
  return '#fff';
};

const getValueColor = (value: number | undefined) => {
  if (value === undefined || value === null) return 'rgba(100, 100, 100, 0.5)';
  if (value === 0) return 'rgba(100, 100, 100, 0.5)'; // grey
  if (value === 1) return 'rgba(255, 0, 0, 0.6)'; // red
  if (value === 2) return 'rgba(255, 255, 0, 0.6)'; // yellow
  if (value === 3) return 'rgba(0, 255, 0, 0.6)'; // green
  return 'rgba(100, 100, 100, 0.5)'; // default grey
};



const RadarCanvas = ({
  heading,
  coverageAz,
  coverageEl,
  centerAz,
  centerEl,
}: {
  heading?: number;
  coverageAz?: number;
  coverageEl?: number;
  centerAz?: number;
  centerEl?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<HTMLImageElement | null>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);

  useEffect(() => {
    // Load SVG image
    const img = new Image();
    img.src = 'icons/mother-aircraft.svg';
    img.onload = () => {
      svgRef.current = img;
      setSvgLoaded(true);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !svgLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Increase padding for labels outside the circle
    const labelPadding = 30;
    const radius = Math.min(centerX, centerY) - labelPadding;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw concentric rings
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw cardinal direction lines
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    const directions = [
      { label: 'N', angle: -90 },
      { label: 'E', angle: 0 },
      { label: 'S', angle: 90 },
      { label: 'W', angle: 180 },
    ];
    directions.forEach((dir) => {
      const angle = (dir.angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();
    });

    // Draw cardinal labels OUTSIDE the frame
    directions.forEach((dir) => {
      const angle = (dir.angle * Math.PI) / 180;
      ctx.fillStyle = 'rgba(255, 255, 0, 1)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Position labels further outside to ensure visibility
      const labelDistance = radius + labelPadding - 5;
      ctx.fillText(
        dir.label,
        centerX + Math.cos(angle) * labelDistance,
        centerY + Math.sin(angle) * labelDistance
      );
    });

    if (heading !== undefined) {
      // Normalize heading to 0-360
      let normalizedHeading = heading;
      while (normalizedHeading < 0) normalizedHeading += 360;
      while (normalizedHeading >= 360) normalizedHeading -= 360;
      
      // Convert heading (0° = North, clockwise) to canvas angle (0° = East, counter-clockwise)
      // Heading 0° (North) should point up (-90° in canvas)
      const headingRad = ((normalizedHeading - 90) * Math.PI) / 180;
      
      // Draw heading line (pin)
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(headingRad) * radius * 0.8,
        centerY + Math.sin(headingRad) * radius * 0.8
      );
      ctx.stroke();
      
      // Draw plane icon at center with golden radial glow
      if (svgRef.current) {
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Create golden radial gradient for glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        // Draw glow
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotate plane to match heading line direction
        // The heading line uses headingRad, so rotate plane by the same angle
        // If SVG points up by default, we need to adjust: rotate by headingRad + 90° to align
        ctx.rotate(headingRad + Math.PI / 2);
        
        // Draw SVG plane icon (rotated to align with heading line)
        ctx.drawImage(svgRef.current, -12, -12, 24, 24);
        ctx.restore();
      }
      
      // Draw heading value at the end of the radar line
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Position at the end of the line (0.8 * radius) with slight offset for better visibility
      const lineEndX = centerX + Math.cos(headingRad) * radius * 0.8;
      const lineEndY = centerY + Math.sin(headingRad) * radius * 0.8;
      ctx.fillText(
        `${normalizedHeading.toFixed(0)}°`,
        lineEndX,
        lineEndY - 8
      );
    }
  }, [heading, coverageAz, coverageEl, centerAz, centerEl, svgLoaded]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        style={{
          width: 280,
          height: 280,
          margin: '8px auto',
          display: 'block',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 0, 0.3)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};

const formatValue = (value: number | string | undefined, suffix?: string) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value}${suffix ?? ''}`;
};

const formatNumber = (value: number | undefined, digits = 1) => {
  if (value === undefined || Number.isNaN(value)) return 'N/A';
  return value.toFixed(digits);
};

const formatYesNo = (value: number | undefined) => {
  if (value === undefined) return 'N/A';
  return value ? 'YES' : 'NO';
};

const SquareGrid = ({
  title,
  items,
}: {
  title: string;
  items: Array<{ code: number; value: number }>;
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div>

      <div className="grid grid-cols-8 gap-[3px]">
        {items.map((item, idx) => {
          const bgColor = getValueColor(item.value);
          return (
            <div
              key={`${title}-${idx}`}
              className="flex h-9 items-center justify-center rounded px-1 text-[22px] font-bold text-white"
              style={{
                border: `1px solid ${bgColor}`,
                background: bgColor,
                textShadow: '1px 1px 2px #000000, -1px -1px 2px #000000, 1px -1px 2px #000000, -1px 1px 2px #000000',
              }}
            >
              {item.code}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function NetworkMembers() {
  const { nodes } = useGetNetworkMembers();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'info' | 'heading' | 'machinery'>('info');

  // Filter to only show nodes with opcode 101 or 102 (same as RadarView)
  const members = useMemo(() => {
    return Array.from(nodes.values())
      .filter((node) => node.opcode === 101 || node.opcode === 102)
      .sort((a, b) => a.globalId - b.globalId);
  }, [nodes]);

  const selected = useMemo(() => {
    if (selectedId == null) return null;
    return members.find((m) => m.globalId === selectedId) ?? null;
  }, [members, selectedId]);

  useEffect(() => {
    if (selectedId == null) return;
    const stillExists = members.some((m) => m.globalId === selectedId);
    if (!stillExists) {
      setSelectedId(null);
    }
  }, [members, selectedId]);

  return (
    <div className="w-full h-full bg-black text-white font-mono">
      <style>{`
        .network-members-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 255, 0, 0.6) rgba(0, 40, 0, 0.4);
        }
        .network-members-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .network-members-scroll::-webkit-scrollbar-track {
          background: rgba(0, 40, 0, 0.4);
          border-left: 1px solid rgba(0, 255, 0, 0.35);
        }
        .network-members-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.55);
          border: 1px solid rgba(0, 255, 0, 0.9);
          border-radius: 2px;
        }
        .network-members-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.8);
        }
      `}</style>
      <div className="flex h-full flex-row">
        {/* Left Panel - Aircraft Image */}
        <div className="flex flex-shrink-0 items-center justify-center bg-black/40 p-[clamp(10px,2vw,20px)] box-border" style={{ width: 'clamp(240px, 28vw, 400px)' }}>
          <img
            src="aircraft-layout.png"
            alt="Aircraft layout"
            className="max-w-[95%] max-h-[95%] w-auto h-auto object-contain block opacity-100"
            style={{ maxWidth: '95%', maxHeight: '95%' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Right Panel - Network Members Grid */}
        <div className="relative flex flex-1 flex-col gap-4 p-4  min-w-0" style={{ maxWidth: 'calc(100% - clamp(240px, 28vw, 400px))' }}>
          <div className="flex items-center justify-between border-b border-white/20 pb-3">
            <h2 className="text-xl font-bold tracking-wider text-white">
              Network Members
            </h2>
            <span className="text-sm text-white/80 font-semibold">
              {members.length} active
            </span>
          </div>

          {members.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-white/60">
              No network members available
            </div>
          ) : (
            <div
              className={`network-members-scroll grid gap-3 overflow-y-auto pr-2 ${
                selected ? 'pointer-events-none opacity-0' : ''
              }`}
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              }}
            >
              {members.map((member) => {
                const isSelected = member.globalId === selectedId;
                const lat = member.latitude;
                const lng = member.longitude;
                const alt = member.altitude;

                return (
                  <button
                    key={member.globalId}
                    type="button"
                    onClick={() => setSelectedId(member.globalId)}
                    className={`w-full rounded-md p-4 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-2 border-green-500 bg-green-500/20'
                        : 'border-2 border-green-500/50 bg-[rgba(0,30,0,0.6)] hover:border-green-500 hover:bg-[rgba(0,50,0,0.7)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-lg font-bold text-[#00ff88]">
                      <span className="tracking-wide">GID {member.globalId}</span>
                      {member.internalData?.isMotherAc === 1 && (
                        <span className="text-[#ffaa00] text-lg font-bold">MOTHER</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5 text-[16px] text-white/90 font-semibold">
                      {typeof lat === 'number' && <div>LAT {lat.toFixed(6)}</div>}
                      {typeof lng === 'number' && <div>LON {lng.toFixed(6)}</div>}
                      {typeof alt === 'number' && <div>ALT {alt.toFixed(0)}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Detail Panel Overlay */}
          {selected && (
            <div className="absolute inset-0 z-10 flex flex-col rounded-md bg-black/95 p-4">
              {(() => {
                const callsignLabel =
                  selected.callsign ??
                  (selected.callsignId !== undefined
                    ? `ID ${selected.callsignId}`
                    : `GID ${selected.globalId}`);
                let heading = selected.trueHeading ?? selected.heading;
                // Normalize heading to 0-360
                if (heading !== undefined) {
                  while (heading < 0) heading += 360;
                  while (heading >= 360) heading -= 360;
                }
                const baroAlt = selected.regionalData?.metadata?.baroAltitude;
                const speed =
                  selected.regionalData?.metadata?.groundSpeed ??
                  selected.veIn;
                const mach = selected.regionalData?.metadata?.mach;
                const fuel = selected.battleGroupData?.fuel;
                const fuelState = selected.battleGroupData?.fuelState;
                const weaponsData = selected.battleGroupData?.weaponsData ?? [];
                const sensorsData = selected.battleGroupData?.sensorsData ?? [];
                const showWeapons = weaponsData.length > 0;
                const showSensors = sensorsData.length > 0;
                const masterArm = selected.battleGroupData?.masterArmStatus;
                const acsStatus = selected.battleGroupData?.acsStatus;
                const legacyFreq1 = formatLegacyFreq(selected.radioData?.legacyFreq1);
                const legacyFreq2 = formatLegacyFreq(selected.radioData?.legacyFreq2);

                const infoRows: Array<{ label: string; value: React.ReactNode }> = [
                  { label: 'Callsign', value: callsignLabel },
                  {
                    label: 'Category',
                    value: formatValue(selected.regionalData?.acCategory),
                  },
                  { label: 'Role', value: formatValue(selected.regionalData?.role) },
                  {
                    label: 'Baro Alt',
                    value: formatValue(formatNumber(baroAlt, 0), 'ft'),
                  },
                  {
                    label: 'Speed',
                    value: formatValue(formatNumber(speed, 1), 'kts'),
                  },
                  {
                    label: 'Lat',
                    value: formatValue(selected.latitude?.toFixed(4)),
                  },
                  { label: 'Fuel', value: formatValue(formatNumber(fuel, 1), '%') },
                  {
                    label: 'Chaff',
                    value: formatValue(selected.battleGroupData?.chaffRemaining),
                  },
                  {
                    label: 'Combat Emerg',
                    value: formatYesNo(selected.battleGroupData?.combatEmergency),
                  },
                  { label: 'ACS Status', value: formatValue(acsStatus) },
                  { label: 'Sensors', value: formatValue(sensorsData.length) },
                  {
                    label: 'Valid',
                    value: formatYesNo(
                      selected.battleGroupData?.isValid ??
                        selected.regionalData?.isValid
                    ),
                  },
                  {
                    label: 'Rogue',
                    value: formatYesNo(selected.regionalData?.isRogue),
                  },
                  {
                    label: 'Recovery Emerg',
                    value: formatYesNo(selected.regionalData?.recoveryEmergency),
                  },
                  {
                    label: 'IDN Tag',
                    value: formatValue(selected.regionalData?.idnTag),
                  },
                  {
                    label: 'Control Node',
                    value: formatValue(selected.regionalData?.controllingNodeId),
                  },
                  {
                    label: 'Track ID',
                    value: formatValue(selected.internalData?.trackId),
                  },
                  { label: 'CTN', value: formatValue(selected.regionalData?.ctn) },
                  {
                    label: 'Callsign ID',
                    value: formatValue(selected.callsignId),
                  },
                  { label: 'Type', value: formatValue(selected.regionalData?.acType) },
                  {
                    label: 'Altitude',
                    value: formatValue(formatNumber(selected.altitude, 0), 'ft'),
                  },
                  {
                    label: 'Heading',
                    value: formatValue(formatNumber(heading, 1), '°'),
                  },
                  { label: 'Mach', value: formatValue(formatNumber(mach, 3)) },
                  {
                    label: 'Lng',
                    value: formatValue(selected.longitude?.toFixed(4)),
                  },
                  { label: 'Fuel State', value: formatValue(fuelState) },
                  {
                    label: 'Flare',
                    value: formatValue(selected.battleGroupData?.flareRemaining),
                  },
                  {
                    label: 'Master Arm',
                    value:
                      masterArm === undefined
                        ? 'N/A'
                        : masterArm
                          ? 'ARMED'
                          : 'SAFE',
                  },
                  { label: 'Weapons', value: formatValue(weaponsData.length) },
                  {
                    label: 'Q1 Lock ID',
                    value: formatValue(selected.battleGroupData?.q1LockGlobalId),
                  },
                  {
                    label: 'Q2 Lock ID',
                    value: formatValue(selected.battleGroupData?.q2LockGlobalId),
                  },
                  {
                    label: 'Radar Lock ID',
                    value: formatValue(selected.battleGroupData?.radarLockGlobalId),
                  },
                  {
                    label: 'Mission Leader',
                    value: formatYesNo(selected.regionalData?.isMissionLeader),
                  },
                  {
                    label: 'Formation',
                    value: formatYesNo(selected.regionalData?.isFormation),
                  },
                  {
                    label: 'C2 Critical',
                    value: formatYesNo(selected.regionalData?.c2Critical),
                  },
                  {
                    label: 'Display ID',
                    value: formatValue(selected.regionalData?.displayId),
                  },
                  { label: 'BIMG', value: formatValue(selected.regionalData?.bimg) },
                  { label: 'TIMG', value: formatValue(selected.regionalData?.timg) },
                  {
                    label: 'Mother AC',
                    value: formatYesNo(selected.internalData?.isMotherAc),
                  },
                  { label: 'Freq 1', value: legacyFreq1 ?? 'N/A' },
                  { label: 'Freq 2', value: legacyFreq2 ?? 'N/A' },
                  {
                    label: 'MANET L',
                    value: formatValue(selected.radioData?.manetLNetId),
                  },
                  {
                    label: 'MANET U1',
                    value: formatValue(selected.radioData?.manetU1NetId),
                  },
                  {
                    label: 'MANET U2',
                    value: formatValue(selected.radioData?.manetU2NetId),
                  },
                  {
                    label: 'SATCOM',
                    value: formatValue(selected.radioData?.satcomMode),
                  },
                  {
                    label: 'Guard Band',
                    value: formatValue(selected.radioData?.guardBand),
                  },
                ];

                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-bold text-white">
                        Node {selected.globalId} - {callsignLabel}
                      </div>
                      <div className="flex items-center gap-2">
                      {fuel !== undefined && (
                          <span className="rounded-md px-3 py-1.5 text-sm font-bold text-black bg-[#16a34a] border-2 border-[#16a34a]">
                            FUEL:{fuel.toFixed(0)}%
                          </span>
                        )}
                        {acsStatus !== undefined && (
                          <span
                            className="rounded-md px-3 py-1.5 text-sm font-bold border-2"
                            style={{
                              background: getACSColor(acsStatus),
                              color: getACSTextColor(acsStatus),
                              borderColor: getACSColor(acsStatus),
                            }}
                          >
                            ACS:{acsStatus}
                          </span>
                        )}
                        {masterArm !== undefined && (
                          <span className="rounded-md px-3 py-1.5 text-sm font-bold text-white bg-[#ea580c] border-2 border-[#ea580c]">
                            {masterArm ? 'ARM' : 'SAFE'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3" style={{zoom:0.9}}>
                        <button
                          type="button"
                          onClick={() => setActiveView('info')}
                          className={`px-4 py-2 h-8 md:h-10 text-[11px] md:text-[13px] font-semibold rounded cursor-pointer transition-all duration-200 text-white flex items-center justify-center hover:opacity-90 ${
                            activeView === 'info' ? 'bg-[#4488ff]' : 'bg-[#2a2a35]'
                          }`}
                          style={{
                            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                          }}
                        >
                          Info
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveView('heading')}
                          className={`px-4 py-2 h-8 md:h-10 text-[11px] md:text-[13px] font-semibold rounded cursor-pointer transition-all duration-200 text-white flex items-center justify-center hover:opacity-90 ${
                            activeView === 'heading' ? 'bg-[#4488ff]' : 'bg-[#2a2a35]'
                          }`}
                          style={{
                            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                          }}
                        >
                          Heading
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveView('machinery')}
                          className={`px-4 py-2 h-8 md:h-10 text-[11px] md:text-[13px] font-semibold rounded cursor-pointer transition-all duration-200 text-white flex items-center justify-center hover:opacity-90 ${
                            activeView === 'machinery' ? 'bg-[#4488ff]' : 'bg-[#2a2a35]'
                          }`}
                          style={{
                            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                          }}
                        >
                          Machinery
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(null);
                            setActiveView('info');
                          }}
                          className="px-4 py-2 h-8 md:h-10 text-[11px] md:text-[13px] font-semibold rounded cursor-pointer transition-all duration-200 text-white flex items-center justify-center hover:opacity-90 bg-[#2a2a35]"
                          style={{
                            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                          }}
                        >
                          Back
                        </button>
                      </div>
                    </div>

                    <div
                      className="network-members-scroll flex-1 flex flex-col gap-4 pr-2 min-h-0"
                    >
                      {/* INFO View: Network member info in 3 columns */}
                      {activeView === 'info' && (
                        <div className="rounded-md bg-black/60 p-4 flex-1 min-h-0 overflow-y-auto w-full box-border" style={{zoom:0.8}}>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                              {infoRows.map((row) => (
                                <div
                                  key={row.label}
                                  className="flex items-center justify-between gap-3 border-b border-white/20 py-[4px] text-[15px] text-white/90"
                                >
                                  <span
                                    className="text-[20px] font-bold min-w-[120px]"
                                    style={{
                                      color: '#00ff00',
                                      textShadow: '0 0 6px rgba(0, 255, 0, 0.6)',
                                    }}
                                  >
                                    {row.label}:
                                  </span>
                                  <span
                                    className="font-bold text-white text-right flex-1 text-[20px]"
                                    style={{
                                      textShadow: '0 0 6px rgba(255, 255, 255, 0.4), 1px 1px 3px #000000',
                                    }}
                                  >
                                    {row.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                        </div>
                      )}

                      {/* HEADING View: Big compass centered */}
                      {activeView === 'heading' && (
                        <div className="flex-1 flex items-center justify-center min-h-0">
                          <div className="rounded-md bg-black/80 p-4 w-full h-full flex items-center justify-center">
                            {(heading !== undefined ||
                              selected.battleGroupData?.radarZoneCoverageAz !==
                                undefined ||
                              selected.battleGroupData?.radarZoneCenterAz !==
                                undefined) && (
                              <div style={{ zoom: 1.5 }}>
                                <RadarCanvas
                                  heading={heading}
                                  coverageAz={selected.battleGroupData?.radarZoneCoverageAz}
                                  coverageEl={selected.battleGroupData?.radarZoneCoverageEl}
                                  centerAz={selected.battleGroupData?.radarZoneCenterAz}
                                  centerEl={selected.battleGroupData?.radarZoneCenterEl}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* MACHINERY View: Only sensors and weapons */}
                      {activeView === 'machinery' && (
                        <div className="rounded-md bg-black/60 p-4 flex-1 min-h-0 overflow-y-auto w-full box-border">
                          <div className="flex flex-col gap-6">
                            {/* Sensors Section */}
                            {showSensors && (
                              <div>
                                <div className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">
                                  SENSORS: {sensorsData.length}
                                </div>
                                <SquareGrid
                                  title=""
                                  items={sensorsData}
                                />
                              </div>
                            )}

                            {/* Weapons Section */}
                            {showWeapons && (
                              <div>
                                <div className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">
                                  WEAPONS: {weaponsData.length}
                                </div>
                                <SquareGrid
                                  title=""
                                  items={weaponsData}
                                />
                              </div>
                            )}

                            {!showSensors && !showWeapons && (
                              <div className="flex items-center justify-center text-white/60 text-lg">
                                No sensors or weapons data available
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
