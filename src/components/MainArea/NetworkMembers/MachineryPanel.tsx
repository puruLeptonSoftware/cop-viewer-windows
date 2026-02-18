import { UDPDataPoint } from '../../../utils/types/udp';

interface MachineryPanelProps {
  member: UDPDataPoint;
}

const getValueColor = (value: number | undefined) => {
  if (value === undefined || value === null) return 'rgba(100, 100, 100, 0.5)';
  if (value === 0) return 'rgba(100, 100, 100, 0.5)'; // grey
  if (value === 1) return 'rgba(255, 0, 0, 0.6)'; // red
  if (value === 2) return 'rgba(255, 255, 0, 0.6)'; // yellow
  if (value === 3) return 'rgba(0, 255, 0, 0.6)'; // green
  return 'rgba(100, 100, 100, 0.5)'; // default grey
};

const SquareGrid = ({
  title,
  items,
}: {
  title: string;
  items: Array<{ code: number; value: number }>;
}) => {
  if (!items || items.length === 0) return null;
  // Limit to max 16 items
  const displayItems = items.slice(0, 16);
  return (
    <div>
      <div className="flex flex-wrap gap-[3px]">
        {displayItems.map((item, idx) => {
          const bgColor = getValueColor(item.value);
          return (
            <div
              key={`${title}-${idx}`}
              className="flex h-7 w-7 items-center justify-center rounded text-xl font-bold text-white"
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

export function MachineryPanel({ member }: MachineryPanelProps) {
  const weaponsData = member.battleGroupData?.weaponsData ?? [];
  const sensorsData = member.battleGroupData?.sensorsData ?? [];
  const showWeapons = weaponsData.length > 0;
  const showSensors = sensorsData.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto network-members-scroll">
        <div className="flex flex-col gap-4">
          {/* Sensors Section */}
          {showSensors && (
            <div>
              <div className="text-lg font-bold text-white mb-2">
                Sensors: {sensorsData.length} units
              </div>
              <SquareGrid title="Sensors" items={sensorsData} />
            </div>
          )}

          {/* Weapons Section */}
          {showWeapons && (
            <div>
              <div className="text-lg font-bold text-white mb-2">
                Weapons: {weaponsData.length} units
              </div>
              <SquareGrid title="Weapons" items={weaponsData} />
            </div>
          )}

          {!showSensors && !showWeapons && (
            <div className="flex items-center justify-center text-white/60 text-lg">
              No sensors or weapons data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

