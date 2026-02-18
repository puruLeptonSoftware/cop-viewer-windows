import { useMemo, useState, useEffect } from 'react';
import { useGetNetworkMembers } from '../../../utils/hooks/useGetNetworkMembers';
import { HeadingPanel } from './HeadingPanel';
import { MachineryPanel } from './MachineryPanel';
import { InfoPanel } from './InfoPanel';

const formatLegacyFreq = (freq: any): string | null => {
  if (!freq || typeof freq !== 'object') return null;
  const digits = [
    freq.D1, freq.D2, freq.D3, freq.D4,
    freq.D5, freq.D6, freq.D7, freq.D8
  ].map((v: any) => (v !== undefined && v !== null ? v : 0));
  if (digits.every((d: number) => d === 0)) return null;
  return digits.join('.');
};

export function NetworkMembers() {
  const { nodes } = useGetNetworkMembers();
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
      {selected ? (
        <div className="flex flex-col h-full">
          {/* Top Bar - Full Width */}
          <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
            <div className="flex items-center text-xl font-bold tracking-wider">
              <span className="text-blue-400">ID{selected.globalId}</span>
              {selected.internalData?.isMotherAc === 1 && (
                <span className="ml-3 text-xl font-bold text-[#ffaa00]">(Mother Aircraft)</span>
              )}
            </div>
            <div className='flex items-center gap-2'>
              <span
                className="rounded-md px-3 py-1.5 text-sm font-bold border-2"
                style={{
                  background: 'rgba(255, 105, 180, 0.15)',
                  borderColor: 'rgba(255, 105, 180, 0.5)',
                  color: '#ff69b4',
                  textShadow: '0 0 6px rgba(255, 105, 180, 0.6)',
                }}
              >
                Freq1: <span style={{ color: '#ffb6c1' }}>{formatLegacyFreq(selected.radioData?.legacyFreq1) ?? 'N/A'}</span>
              </span>
              <span
                className="rounded-md px-3 py-1.5 text-sm font-bold border-2"
                style={{
                  background: 'rgba(255, 105, 180, 0.15)',
                  borderColor: 'rgba(255, 105, 180, 0.5)',
                  color: '#ff69b4',
                  textShadow: '0 0 6px rgba(255, 105, 180, 0.6)',
                }}
              >
                Freq2: <span style={{ color: '#ffb6c1' }}>{formatLegacyFreq(selected.radioData?.legacyFreq2) ?? 'N/A'}</span>
              </span>
              {selected.battleGroupData?.fuel !== undefined && (
                <span className="rounded-md px-3 py-1.5 text-sm font-bold text-black bg-[#16a34a] border-2 border-[#16a34a]">
                  FUEL:{selected.battleGroupData.fuel.toFixed(0)}%
                </span>
              )}
              {selected.battleGroupData?.acsStatus !== undefined && (
                <span
                  className="rounded-md px-3 py-1.5 text-sm font-bold border-2"
                  style={{
                    background: selected.battleGroupData.acsStatus === 0 ? 'rgba(100, 100, 100, 0.5)' : 
                                selected.battleGroupData.acsStatus === 1 ? 'rgba(0, 255, 0, 0.6)' :
                                selected.battleGroupData.acsStatus === 2 ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)',
                    color: selected.battleGroupData.acsStatus === 0 ? '#888' :
                           selected.battleGroupData.acsStatus === 1 ? '#000' :
                           selected.battleGroupData.acsStatus === 2 ? '#000' : '#fff',
                    borderColor: selected.battleGroupData.acsStatus === 0 ? 'rgba(100, 100, 100, 0.5)' :
                                 selected.battleGroupData.acsStatus === 1 ? 'rgba(0, 255, 0, 0.6)' :
                                 selected.battleGroupData.acsStatus === 2 ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)',
                  }}
                >
                  ACS:{selected.battleGroupData.acsStatus}
                </span>
              )}
              {selected.battleGroupData?.masterArmStatus !== undefined && (
                <span className="rounded-md px-3 py-1.5 text-sm font-bold text-white bg-[#ea580c] border-2 border-[#ea580c]">
                  {selected.battleGroupData.masterArmStatus ? 'ARM' : 'SAFE'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                tabIndex={-1}
                className="rounded-md px-3 py-1.5 text-sm font-bold cursor-pointer transition-all duration-200 text-white bg-[#363440] hover:bg-[#4a4855] border-2 border-[#363440]"
              >
                Back
              </button>
            </div>

          </div>
          
          <div className="flex flex-1 flex-row min-h-0">
            {/* Left Panel - Heading Panel (top) + Machinery Panel (bottom) */}
            <div className="flex flex-col w-[20%] gap-4 p-2 pl-4">
              <div className="shrink-0">
                <HeadingPanel member={selected} />
              </div>
              <div className="flex-1 min-h-0">
                <MachineryPanel member={selected} />
              </div>
            </div>

            {/* Right Panel - Info Panel */}
            <div className="flex flex-1 flex-col gap-4 p-4 min-w-0">
              <InfoPanel member={selected} />
            </div>
          </div>
        </div>
      ) : (
        <div className='flex flex-row h-full'>
            {/* Left Panel - Aircraft Image (only when no selection) */}
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
            <div className="relative flex flex-1 flex-col gap-4 p-4 min-w-0" style={{ maxWidth: 'calc(100% - clamp(240px, 28vw, 400px))' }}>
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
              className={`network-members-scroll grid gap-1.5 overflow-y-auto pr-2 ${
                selected ? 'pointer-events-none opacity-0' : ''
              }`}
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              }}
            >
              {members.map((member) => {
                const lat = member.latitude;
                const lng = member.longitude;

                return (
                  <button
                    key={member.globalId}
                    type="button"
                    tabIndex={-1}
                    onClick={() => setSelectedId(member.globalId)}
                    className={`w-full rounded-md p-2 text-left transition-all duration-200 cursor-pointer ${
                      member.internalData?.isMotherAc === 1
                        ? 'border-2  border-[#ffaa00] bg-[rgba(0,30,0,0.6)] hover:bg-[rgba(0,50,0,0.7)]'
                        : 'border-2 border-green-500/50 bg-[rgba(0,30,0,0.6)] hover:border-green-500 hover:bg-[rgba(0,50,0,0.7)]'
                    }`}
                  >
                    <div className="flex items-center justify-start text-lg font-bold text-[#00ff88]">
                      <span className="tracking-wide">ID{member.globalId + " "}</span>
                      {member.internalData?.isMotherAc === 1 && (
                        <span className="text-[#ffaa00] text-lg font-bold"> &nbsp;(MA)</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5 text-[16px] text-white/90 font-semibold">
                      {typeof lat === 'number' && <div><span className="text-blue-400">LAT</span> {lat.toFixed(6)}°</div>}
                      {typeof lng === 'number' && <div><span className="text-blue-400">LON</span> {lng.toFixed(6)}°</div>}
                    </div>
                  </button>
                );
              })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
    </div>
  );
}
