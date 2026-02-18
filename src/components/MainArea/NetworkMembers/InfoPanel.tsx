import { UDPDataPoint } from '../../../utils/types/udp';

interface InfoPanelProps {
  member: UDPDataPoint;
}

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

export function InfoPanel({ member }: InfoPanelProps) {
  let heading = member.trueHeading ?? member.heading;
  // Normalize heading to 0-360
  if (heading !== undefined) {
    while (heading < 0) heading += 360;
    while (heading >= 360) heading -= 360;
  }
  
  const baroAlt = member.regionalData?.metadata?.baroAltitude;
  const speed =
    member.regionalData?.metadata?.groundSpeed ??
    member.veIn;
  const mach = member.regionalData?.metadata?.mach;
  const fuelState = member.battleGroupData?.fuelState;
  const sensorsData = member.battleGroupData?.sensorsData ?? [];
  const masterArm = member.battleGroupData?.masterArmStatus;
  const acsStatus = member.battleGroupData?.acsStatus;

  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: 'Category',
      value: formatValue(member.regionalData?.acCategory),
    },
    { label: 'Role', value: formatValue(member.regionalData?.role) },
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
      value: formatValue(member.latitude?.toFixed(4)),
    },
    { label: 'Fuel State', value: fuelState === 0 ? 'N/A' : fuelState === 1 ? 'BINGO' : fuelState === 2 ? 'JOKER' : fuelState === 3 ? 'THIRSTY' : formatValue(fuelState) },
    {
      label: 'Chaff',
      value: formatValue(member.battleGroupData?.chaffRemaining),
    },
    {
      label: 'Combat Emerg',
      value: formatYesNo(member.battleGroupData?.combatEmergency),
    },
    { label: 'ACS Status', value: formatValue(acsStatus) },
    { label: 'Sensors', value: formatValue(sensorsData.length) },
    {
      label: 'Valid',
      value: formatYesNo(
        member.battleGroupData?.isValid ??
          member.regionalData?.isValid
      ),
    },
    {
      label: 'Rogue',
      value: formatYesNo(member.regionalData?.isRogue),
    },
    {
      label: 'Recovery Emerg',
      value: formatYesNo(member.regionalData?.recoveryEmergency),
    },
    {
      label: 'IDN Tag',
      value: formatValue(member.regionalData?.idnTag),
    },
    {
      label: 'Control Node',
      value: formatValue(member.regionalData?.controllingNodeId),
    },
    {
      label: 'Track ID',
      value: formatValue(member.internalData?.trackId),
    },
    { label: 'CTN', value: formatValue(member.regionalData?.ctn) },
    {
      label: 'Callsign ID',
      value: formatValue(member.callsignId),
    },
    { label: 'Type', value: formatValue(member.regionalData?.acType) },
    {
      label: 'Altitude',
      value: formatValue(formatNumber(member.altitude, 0), 'ft'),
    },
    {
      label: 'Heading',
      value: formatValue(formatNumber(heading, 1), '°'),
    },
    { label: 'Mach', value: formatValue(formatNumber(mach, 3)) },
    {
      label: 'Lng',
      value: formatValue(member.longitude?.toFixed(4)),
    },
    {
      label: 'Flare',
      value: formatValue(member.battleGroupData?.flareRemaining),
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
    { label: 'Weapons', value: formatValue(member.battleGroupData?.weaponsData?.length ?? 0) },
    {
      label: 'Q1 Lock ID',
      value: formatValue(member.battleGroupData?.q1LockGlobalId),
    },
    {
      label: 'Q2 Lock ID',
      value: formatValue(member.battleGroupData?.q2LockGlobalId),
    },
    {
      label: 'Radar Lock ID',
      value: formatValue(member.battleGroupData?.radarLockGlobalId),
    },
    {
      label: 'Mission Leader',
      value: formatYesNo(member.regionalData?.isMissionLeader),
    },
    {
      label: 'Formation',
      value: formatYesNo(member.regionalData?.isFormation),
    },
    {
      label: 'C2 Critical',
      value: formatYesNo(member.regionalData?.c2Critical),
    },
    {
      label: 'Display ID',
      value: formatValue(member.regionalData?.displayId),
    },
    { label: 'BIMG', value: formatValue(member.regionalData?.bimg) },
    { label: 'TIMG', value: formatValue(member.regionalData?.timg) },
    {
      label: 'MANET L',
      value: formatValue(member.radioData?.manetLNetId),
    },
    {
      label: 'MANET U1',
      value: formatValue(member.radioData?.manetU1NetId),
    },
    {
      label: 'MANET U2',
      value: formatValue(member.radioData?.manetU2NetId),
    },
    {
      label: 'SATCOM',
      value: formatValue(member.radioData?.satcomMode),
    },
    {
      label: 'Guard Band',
      value: formatValue(member.radioData?.guardBand),
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{zoom: 0.85}}>
      <div className="flex-1 overflow-y-auto network-members-scroll">
        <div className="rounded-md bg-black/60 p-4">
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
      </div>
    </div>
  );
}

