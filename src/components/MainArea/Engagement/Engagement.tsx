import { useState, useMemo } from 'react';
import { useGetEngagements } from '../../../utils/hooks/useGetEngagements';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';
import { EngagementData } from '../../../utils/types/udp';

const EngagementCard = ({
  engagement,
  index,
  attacker,
  target,
  isSelected,
  onSelect,
}: {
  engagement: EngagementData;
  index: number;
  attacker: any;
  target: any;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const attackerCallsign = attacker?.callsign || `ID${engagement.globalId}`;
  const targetCallsign = target?.callsign || `ID${engagement.engagementTargetGid}`;

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer select-none rounded-md p-2.5 flex flex-col gap-2 transition-all duration-150 ${
        isSelected
          ? 'bg-[rgba(60,60,60,0.7)] border-2 border-white shadow-lg'
          : 'bg-[rgba(20,20,20,0.5)] border border-white/50 hover:border-white hover:bg-[rgba(30,30,30,0.6)]'
      }`}
    >
      {/* Engagement number */}
      <div className="text-sm font-bold text-white text-center [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">
        #{String(index + 1).padStart(2, '0')}
      </div>

      {/* Participants section */}
      <div className="flex flex-col gap-1.5">
        {/* Attacker */}
        <div
          className={`px-2 py-1.5 border border-[#00ff00] rounded text-center ${
            isSelected ? 'bg-[rgba(0,255,0,0.2)]' : 'bg-[rgba(0,255,0,0.1)]'
          }`}
        >
          <div className="text-sm font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">
            {attackerCallsign}
          </div>
          <div className="text-[10px] font-semibold text-white opacity-90 mt-0.5 [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">
            GID: {engagement.globalId}
          </div>
        </div>

        {/* Arrow */}
        <div className="text-lg text-red-500 font-black text-center">↓</div>

        {/* Target */}
        <div
          className={`px-2 py-1.5 border border-red-500 rounded text-center ${
            isSelected ? 'bg-[rgba(255,0,0,0.2)]' : 'bg-[rgba(255,0,0,0.1)]'
          }`}
        >
          <div className="text-sm font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">
            {targetCallsign}
          </div>
          <div className="text-[10px] font-semibold text-white opacity-90 mt-0.5 [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">
            GID: {engagement.engagementTargetGid}
          </div>
        </div>
      </div>
    </div>
  );
};

const EngagementDetailPanel = ({
  engagement,
  index,
  attacker,
  target,
  onClose,
}: {
  engagement: EngagementData;
  index: number;
  attacker: any;
  target: any;
  onClose: () => void;
}) => {
  const attackerCallsign = attacker?.callsign || `ID${engagement.globalId}`;
  const targetCallsign = target?.callsign || `ID${engagement.engagementTargetGid}`;

  const isLaunched = engagement.weaponLaunch === 1;
  const hasHangFire = engagement.hangFire === 1;

  const statusText = isLaunched ? 'WEAPON LAUNCHED' : hasHangFire ? 'HANG FIRE' : 'READY';
  
  // Determine status classes based on state
  const statusBgClass = isLaunched
    ? 'bg-[rgba(255,0,0,0.15)]'
    : hasHangFire
    ? 'bg-[rgba(255,170,0,0.15)]'
    : 'bg-[rgba(0,255,0,0.15)]';
  const statusBorderClass = isLaunched
    ? 'border-[#ff0000]'
    : hasHangFire
    ? 'border-[#ffaa00]'
    : 'border-[#00ff00]';
  const statusTextColorClass = isLaunched
    ? 'text-[#ff6666]'
    : hasHangFire
    ? 'text-[#ffcc00]'
    : 'text-[#00ff00]';

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[80vh] bg-[rgba(10,10,10,0.98)] border-2 border-white rounded-lg p-4 z-[2000] overflow-y-auto text-white pointer-events-auto font-mono shadow-2xl">
      {/* Close button */}
      <div
        onClick={onClose}
        className="absolute top-2 right-2 text-white cursor-pointer text-sm font-bold w-6 h-6 flex items-center justify-center border border-white rounded bg-[rgba(255,0,0,0.2)] hover:bg-[rgba(255,0,0,0.3)] select-none [text-shadow:1px_1px_0_black] transition-colors"
      >
        ×
      </div>

      {/* Title */}
      <div className="text-lg font-bold text-white mb-3 text-center border-b border-white/50 pb-2 [text-shadow:1px_1px_0_black]">
        ENGAGEMENT #{String(index + 1).padStart(2, '0')}
      </div>

      {/* Participants section */}
      <div className="mb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 px-2.5 py-2 bg-[rgba(0,255,0,0.1)] border border-[#00ff00] rounded text-center">
            <div className="text-[10px] font-semibold text-white opacity-90 mb-1 [text-shadow:1px_1px_0_black]">ATTACKER</div>
            <div className="text-base font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">{attackerCallsign}</div>
            <div className="text-[10px] font-medium text-white opacity-80 mt-0.5 [text-shadow:1px_1px_0_black]">
              GID: {engagement.globalId}
            </div>
          </div>
          <div className="text-xl text-red-500 font-black">→</div>
          <div className="flex-1 px-2.5 py-2 bg-[rgba(255,0,0,0.1)] border border-red-500 rounded text-center">
            <div className="text-[10px] font-semibold text-white opacity-90 mb-1 [text-shadow:1px_1px_0_black]">TARGET</div>
            <div className="text-base font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">{targetCallsign}</div>
            <div className="text-[10px] font-medium text-white opacity-80 mt-0.5 [text-shadow:1px_1px_0_black]">
              GID: {engagement.engagementTargetGid}
            </div>
          </div>
        </div>
      </div>

      {/* Status section */}
      <div className={`mb-3 px-2.5 py-2 rounded text-center border ${statusBgClass} ${statusBorderClass}`}>
        <div className="text-[10px] font-semibold text-white opacity-90 mb-1 [text-shadow:1px_1px_0_black]">STATUS</div>
        <div className={`text-base font-bold ${statusTextColorClass} [text-shadow:1px_1px_0_black]`}>
          {statusText}
        </div>
      </div>

      {/* Timing information */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-2.5 py-2 bg-[rgba(255,255,0,0.1)] border border-yellow-400 rounded text-center">
          <div className="text-[10px] font-semibold text-white opacity-90 mb-1 [text-shadow:1px_1px_0_black]">TIME TO HIT</div>
          <div className="text-xl font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">{engagement.tth}</div>
          <div className="text-[10px] font-medium text-white opacity-80 mt-0.5 [text-shadow:1px_1px_0_black]">SEC</div>
        </div>
        <div className="px-2.5 py-2 bg-[rgba(255,255,0,0.1)] border border-yellow-400 rounded text-center">
          <div className="text-[10px] font-semibold text-white opacity-90 mb-1 [text-shadow:1px_1px_0_black]">TIME TO ARRIVAL</div>
          <div className="text-xl font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">{engagement.tta}</div>
          <div className="text-[10px] font-medium text-white opacity-80 mt-0.5 [text-shadow:1px_1px_0_black]">SEC</div>
        </div>
      </div>

      {/* Range information */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'DMAX1', value: engagement.dMax1 },
          { label: 'DMAX2', value: engagement.dMax2 },
          { label: 'DMIN', value: engagement.dmin },
        ].map((range) => {
          const value = isNaN(range.value) ? 'N/A' : range.value.toFixed(2);
          return (
            <div
              key={range.label}
              className="px-2 py-1.5 bg-[rgba(0,255,255,0.1)] border border-cyan-400 rounded text-center"
            >
              <div className="text-[10px] font-semibold text-white opacity-90 mb-0.5 [text-shadow:1px_1px_0_black]">{range.label}</div>
              <div className="text-sm font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">{value}</div>
              <div className="text-[9px] font-medium text-white opacity-80 mt-0.5 [text-shadow:1px_1px_0_black]">NM</div>
            </div>
          );
        })}
      </div>

      {/* Weapon code */}
      <div className="px-2.5 py-2 bg-[rgba(255,0,255,0.1)] border border-fuchsia-500 rounded text-center">
        <div className="text-[10px] font-semibold text-white opacity-90 mb-1 [text-shadow:1px_1px_0_black]">WEAPON CODE</div>
        <div className="text-lg font-bold text-white [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black]">
          {engagement.engagementTargetWeaponCode}
        </div>
      </div>
    </div>
  );
};

export default function Engagement() {
  const { engagements, isLoading } = useGetEngagements();
  const { nodes } = useGetNetworkMembers();
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);

  // Use the nodes map directly from the hook
  const nodesMap = useMemo(() => {
    return nodes;
  }, [nodes]);

  // Find the selected engagement by ID (so dialog stays open even if engagement disappears)
  const selectedEngagement = useMemo(() => {
    if (!selectedEngagementId) return null;
    return engagements.find(
      (eng) => `${eng.globalId}-${eng.engagementTargetGid}` === selectedEngagementId
    ) || null;
  }, [engagements, selectedEngagementId]);

  const selectedIndex = selectedEngagement
    ? engagements.findIndex(
        (eng) => `${eng.globalId}-${eng.engagementTargetGid}` === selectedEngagementId
      )
    : null;

  const selectedAttacker = selectedEngagement
    ? nodesMap.get(selectedEngagement.globalId)
    : null;
  const selectedTarget = selectedEngagement
    ? nodesMap.get(selectedEngagement.engagementTargetGid)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        Loading engagements...
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black text-[#00ff00] overflow-hidden font-mono">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-3 border-b border-white/30 bg-gradient-to-r from-[rgba(20,20,20,0.5)] to-[rgba(30,30,30,0.3)] backdrop-blur-sm">
        <div className="text-xl font-bold text-white tracking-wider [text-shadow:1px_1px_0_black,-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black,0_0_8px_rgba(0,255,0,0.5)]">
          ENGAGEMENT STATUS
        </div>
        {engagements.length > 0 && (
          <div className="text-sm font-semibold text-white/80 [text-shadow:1px_1px_0_black]">
            {engagements.length} {engagements.length === 1 ? 'ACTIVE' : 'ACTIVE'}
          </div>
        )}
      </div>

      {/* Scrollable grid container */}
      <div
        id="engagement-list-container"
        className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-4 grid grid-cols-4 gap-4 content-start min-h-0"
      >
        {engagements.length === 0 ? (
          <div className="col-span-full text-center text-white text-[28px] font-black py-[60px] px-5 opacity-70 mt-[100px] [text-shadow:0_0_10px_rgba(255,255,255,0.8)]">
            NO ACTIVE ENGAGEMENTS
          </div>
        ) : (
          engagements.map((engagement, index) => {
            const attacker = nodesMap.get(engagement.globalId);
            const target = nodesMap.get(engagement.engagementTargetGid);
            const engagementId = `${engagement.globalId}-${engagement.engagementTargetGid}`;
            return (
              <EngagementCard
                key={engagementId}
                engagement={engagement}
                index={index}
                attacker={attacker}
                target={target}
                isSelected={selectedEngagementId === engagementId}
                onSelect={() => setSelectedEngagementId(engagementId)}
              />
            );
          })
        )}
      </div>

      {/* Detail panel - stays open even if engagement disappears */}
      {selectedEngagement && selectedIndex !== null && (
        <EngagementDetailPanel
          engagement={selectedEngagement}
          index={selectedIndex}
          attacker={selectedAttacker}
          target={selectedTarget}
          onClose={() => setSelectedEngagementId(null)}
        />
      )}

      {/* Custom scrollbar styling */}
      <style>{`
        #engagement-list-container::-webkit-scrollbar {
          width: 12px;
        }
        #engagement-list-container::-webkit-scrollbar-track {
          background: rgba(0, 20, 0, 0.3);
          border-left: 1px solid #00ff00;
        }
        #engagement-list-container::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.5);
          border: 1px solid #00ff00;
          border-radius: 2px;
        }
        #engagement-list-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.7);
        }
      `}</style>
    </div>
  );
}

