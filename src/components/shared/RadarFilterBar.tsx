export type RadarFilter = 'all' | 'network-members' | 'targets' | 'threats' | 'mother-node';

interface RadarFilterBarProps {
  onFilterChange: (filter: RadarFilter) => void;
  activeFilter: RadarFilter;
}

export function RadarFilterBar({ onFilterChange, activeFilter }: RadarFilterBarProps) {
  const handleFilterClick = (filter: RadarFilter) => {
    onFilterChange(filter);
  };

  const buttonBaseClasses = 'px-4 py-2 h-8 md:h-10 text-[11px] md:text-[13px] font-semibold rounded cursor-pointer transition-all duration-200 text-white flex items-center justify-center hover:opacity-90';
  const activeClasses = 'bg-[#4488ff]';
  const inactiveClasses = 'bg-[#2a2a35]';

  return (
    <div 
      className="absolute top-0 left-0 right-[130px] md:right-[150px] z-30 w-[100%] flex items-center justify-center gap-4 p-3 bg-[#1a1a25]"
      style={{
        textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
      }}
    >
      <button
        type="button"
        onClick={() => handleFilterClick('network-members')}
        className={`${buttonBaseClasses} ${
          activeFilter === 'network-members' ? activeClasses : inactiveClasses
        }`}
        style={{
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
        }}
        tabIndex={-1}
      >
        Network Member
      </button>
      <button
        type="button"
        onClick={() => handleFilterClick('targets')}
        className={`${buttonBaseClasses} ${
          activeFilter === 'targets' ? activeClasses : inactiveClasses
        }`}
        style={{
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
        }}
        tabIndex={-1}
      >
        Targets
      </button>
      <button
        type="button"
        onClick={() => handleFilterClick('threats')}
        className={`${buttonBaseClasses} ${
          activeFilter === 'threats' ? activeClasses : inactiveClasses
        }`}
        style={{
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
        }}
        tabIndex={-1}
      >
        Threats
      </button>
      <button
        type="button"
        onClick={() => handleFilterClick('mother-node')}
        className={`${buttonBaseClasses} ${
          activeFilter === 'mother-node' ? activeClasses : inactiveClasses
        }`}
        style={{
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
        }}
        tabIndex={-1}
      >
        Mother Node
      </button>
      <button
        type="button"
        onClick={() => handleFilterClick('all')}
        className={`${buttonBaseClasses} ${
          activeFilter === 'all' ? activeClasses : inactiveClasses
        }`}
        style={{
          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
        }}
        tabIndex={-1}
      >
        All Nodes
      </button>
    </div>
  );
}

