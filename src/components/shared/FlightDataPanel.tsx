import React from 'react';

interface FlightDataPanelProps {
  data: {
    groundSpeed?: number;
    dme?: number;
    heading?: number;
    course?: number;
    verticalSpeed?: number;
    metadata?: {
      baroAltitude?: number;
      groundSpeed?: number;
      mach?: number;
    };
  };
  className?: string;
}

export const FlightDataPanel: React.FC<FlightDataPanelProps> = ({ data, className = '' }) => {
  const metadata = data.metadata || {};
  const gsValue =
    metadata.groundSpeed !== undefined
      ? Math.round(metadata.groundSpeed)
      : typeof data.groundSpeed === 'number'
        ? Math.round(data.groundSpeed)
        : null;
  const baroAltValue =
    metadata.baroAltitude !== undefined ? Math.round(metadata.baroAltitude) : null;
  const machValue = metadata.mach !== undefined ? metadata.mach.toFixed(3) : null;

  const vsValue = typeof data.verticalSpeed === 'number' 
    ? `${data.verticalSpeed < 0 ? '-' : '+'}${Math.abs(data.verticalSpeed)}` 
    : null;

  const items = [
    { label: 'GS', value: gsValue !== null ? gsValue.toString() : null },
    { label: 'DME', value: data.dme !== undefined ? data.dme.toFixed(1) : null },
    { label: 'HDG', value: typeof data.heading === 'number' ? Math.round(data.heading).toString() : null },
    { label: 'CRS', value: typeof data.course === 'number' ? Math.round(data.course).toString() : null },
    { label: 'ILS', value: '1' },
    { label: 'BARO', value: baroAltValue !== null ? baroAltValue.toString() : null },
    { label: 'MACH', value: machValue !== null ? machValue : null },
    { label: 'VS', value: vsValue },
  ].filter(item => item.value !== null);

  return (
    <div className={`bg-gray-900 rounded-lg border border-white/30 p-[clamp(8px,1vh,10px)_clamp(10px,1.2vw,12px)] text-white font-sans max-w-[clamp(240px,28vw,300px)] min-w-[200px] ${className}`}>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <div key={index} className="text-white text-[clamp(11px,1.3vw,13px)]">
            <span className="font-semibold text-cyan-300">{item.label}</span>{' '}
            <span className="font-normal">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
