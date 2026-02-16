import React from 'react';

interface StatusIndicatorsProps {
  data: {
    battleGroupData?: {
      combatEmergency?: boolean | number;
      masterArmStatus?: boolean | number;
      acsStatus?: number;
      fuel?: number;
      chaffRemaining?: number;
      flareRemaining?: number;
    };
  };
  className?: string;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ data, className = '' }) => {
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

  const hasAnyData =
    bgd.combatEmergency !== undefined ||
    bgd.masterArmStatus !== undefined ||
    bgd.acsStatus !== undefined ||
    bgd.fuel !== undefined ||
    bgd.chaffRemaining !== undefined ||
    bgd.flareRemaining !== undefined;

  if (!hasAnyData) return null;

  return (
    <div
      className={`bg-gray-900 rounded-lg border border-white/30 p-[10px_12px] text-white font-sans w-[110px] ${className}`}
    >
      <div className="flex flex-col gap-[6px]">
        {bgd.combatEmergency !== undefined && (
          <div
            className={`text-[13px] font-semibold ${
              (typeof bgd.combatEmergency === 'boolean' ? bgd.combatEmergency : bgd.combatEmergency !== 0)
                ? 'text-red-500 animate-pulse'
                : 'text-white'
            }`}
          >
            {(typeof bgd.combatEmergency === 'boolean' ? bgd.combatEmergency : bgd.combatEmergency !== 0)
              ? 'EMERG'
              : 'OK'}
          </div>
        )}
        {bgd.masterArmStatus !== undefined && (
          <div className="text-[13px]">
            <span className="font-semibold text-cyan-300">ARM</span>{' '}
            <span
              className={`font-normal ${
                (typeof bgd.masterArmStatus === 'boolean' ? bgd.masterArmStatus : bgd.masterArmStatus !== 0)
                  ? 'text-orange-500'
                  : 'text-gray-500'
              }`}
            >
              {(typeof bgd.masterArmStatus === 'boolean' ? bgd.masterArmStatus : bgd.masterArmStatus !== 0)
                ? 'ARM'
                : 'SAFE'}
            </span>
          </div>
        )}
        {bgd.acsStatus !== undefined && (
          <div className="text-[13px]">
            <span className="font-semibold text-cyan-300">ACS</span>{' '}
            <span
              className="font-normal px-1.5 py-0.5 rounded"
              style={{
                color: getACSTextColor(bgd.acsStatus),
                background: getACSColor(bgd.acsStatus),
              }}
            >
              {bgd.acsStatus}
            </span>
          </div>
        )}
        {bgd.fuel !== undefined && (
          <div className="text-[13px]">
            <span className="font-semibold text-cyan-300">FUEL</span>{' '}
            <span
              className="font-normal px-1.5 py-0.5 rounded text-black"
              style={{
                background: getFuelColor(bgd.fuel),
              }}
            >
              {bgd.fuel.toFixed(0)}
            </span>
          </div>
        )}
        {bgd.chaffRemaining !== undefined && (
          <div className="text-[13px]">
            <span className="font-semibold text-cyan-300">CHAFF</span>{' '}
            <span className="font-normal">{bgd.chaffRemaining}</span>
          </div>
        )}
        {bgd.flareRemaining !== undefined && (
          <div className="text-[13px]">
            <span className="font-semibold text-cyan-300">FLARE</span>{' '}
            <span className="font-normal">{bgd.flareRemaining}</span>
          </div>
        )}
      </div>
    </div>
  );
};
