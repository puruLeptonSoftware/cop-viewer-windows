import React from 'react';

interface MotherAircraftInfoPanelProps {
  motherAircraftInfo: {
    globalId: number;
    callsignId?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  flightData: {
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

export const MotherAircraftInfoPanel: React.FC<MotherAircraftInfoPanelProps> = ({
  motherAircraftInfo,
  flightData,
  className = '',
}) => {
  const metadata = flightData.metadata || {};
  const gsValue =
    metadata.groundSpeed !== undefined
      ? Math.round(metadata.groundSpeed)
      : typeof flightData.groundSpeed === 'number'
        ? Math.round(flightData.groundSpeed)
        : null;
  const baroAltValue =
    metadata.baroAltitude !== undefined ? Math.round(metadata.baroAltitude) : null;
  const machValue = metadata.mach !== undefined ? metadata.mach.toFixed(3) : null;
  const vsValue = typeof flightData.verticalSpeed === 'number' 
    ? `${flightData.verticalSpeed < 0 ? '-' : '+'}${Math.abs(flightData.verticalSpeed)}` 
    : null;

  return (
    <div className={`bg-gray-900 rounded-lg border border-white/30 p-[10px_12px] text-white font-sans max-w-[300px] min-w-[200px] ${className}`}>
      {/* Mother Node header - Golden color */}
      <div className="text-yellow-400 font-bold mb-2 text-[17px] border-b border-white/40 pb-1.5">
        Mother Node
      </div>

      {/* Content Section - Grid 2 columns */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {/* Mother Aircraft Info */}
        <div className="text-white text-[13px]">
          <span className="font-semibold text-cyan-300">Network Node Id:</span>{' '}
          <span className="font-normal">{motherAircraftInfo.globalId}</span>
        </div>

        {motherAircraftInfo.callsignId !== undefined && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">Call Sign:</span>{' '}
            <span className="font-normal">{motherAircraftInfo.callsignId}</span>
          </div>
        )}

        {motherAircraftInfo.latitude !== undefined && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">Latitude:</span>{' '}
            <span className="font-normal">{motherAircraftInfo.latitude.toFixed(5)}</span>
          </div>
        )}

        {motherAircraftInfo.longitude !== undefined && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">Longitude:</span>{' '}
            <span className="font-normal">{motherAircraftInfo.longitude.toFixed(5)}</span>
          </div>
        )}

        {motherAircraftInfo.altitude !== undefined && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">Altitude:</span>{' '}
            <span className="font-normal">{Math.round(motherAircraftInfo.altitude)}ft</span>
          </div>
        )}

        {/* Flight Data */}
        {gsValue !== null && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">GS</span>{' '}
            <span className="font-normal">{gsValue}</span>
          </div>
        )}

        {flightData.dme !== undefined && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">DME</span>{' '}
            <span className="font-normal">{flightData.dme.toFixed(1)}</span>
          </div>
        )}

        {typeof flightData.heading === 'number' && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">HDG</span>{' '}
            <span className="font-normal">{Math.round(flightData.heading)}</span>
          </div>
        )}

        {typeof flightData.course === 'number' && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">CRS</span>{' '}
            <span className="font-normal">{Math.round(flightData.course)}</span>
          </div>
        )}

        <div className="text-white text-[13px]">
          <span className="font-semibold text-cyan-300">ILS</span>{' '}
          <span className="font-normal">1</span>
        </div>

        {baroAltValue !== null && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">BARO</span>{' '}
            <span className="font-normal">{baroAltValue}</span>
          </div>
        )}

        {machValue !== null && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">MACH</span>{' '}
            <span className="font-normal">{machValue}</span>
          </div>
        )}

        {vsValue !== null && (
          <div className="text-white text-[13px]">
            <span className="font-semibold text-cyan-300">VS</span>{' '}
            <span className="font-normal">{vsValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

