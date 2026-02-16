import { ViewMode } from '../../types';
import { useMap } from '../../contexts/MapContext';

interface RightSidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function RightSidebar({
  viewMode,
  onViewModeChange,
}: RightSidebarProps) {
  const { isMapVisible, toggleMap, zoomLevel, zoomIn, zoomOut } = useMap();
  
  // Get current zoom based on view mode
  const currentZoom = viewMode === 'self-only' ? zoomLevel.self : zoomLevel.radar;
  
  // Check if zoom buttons should be disabled
  const canZoomIn = currentZoom < 18;
  const canZoomOut = currentZoom > 1;

  // Hide map and zoom controls for these view modes
  const shouldHideMapAndZoom =
    viewMode === 'hud' || viewMode === 'aircraft-layout' || viewMode === 'eng';

  // View mode button classes - returns Tailwind classes based on mode and active state
  const getViewModeButtonClasses = (mode: ViewMode) => {
    const isActive = viewMode === mode;
    
    if (!isActive) {
      return 'bg-[#2a2a35]';
    }
    
    const activeClasses: Record<ViewMode, string> = {
      normal: 'bg-[#44ff44]',
      'self-only': 'bg-[#ff8844]',
      hud: 'bg-[#8844ff]',
      'aircraft-layout': 'bg-[#44aaff]',
      eng: 'bg-[#ff44aa]',
    };
    
    return activeClasses[mode];
  };

  const buttonBaseClasses =
    'w-full h-8 md:h-10 rounded cursor-pointer font-semibold text-[11px] md:text-[13px] transition-all duration-200 flex items-center justify-center box-border overflow-hidden text-ellipsis whitespace-nowrap px-1 hover:opacity-90 text-white';

  return (
    <div className="fixed right-0 top-0 w-[130px] md:w-[150px] h-screen bg-[#1a1a25] shadow-2xl flex flex-col items-center py-3 md:py-5 px-2 md:px-3 gap-2 md:gap-3.5 z-[100] isolate box-border overflow-hidden">
      {/* Section 1: View Mode Buttons + Map Button */}
      <div className="flex flex-col items-center gap-1.5 md:gap-2 w-full box-border">
        {/* Radar Button */}
        <button
          data-view-mode="101"
          onClick={() => viewMode !== 'normal' && onViewModeChange('normal')}
          disabled={viewMode === 'normal'}
          className={`${buttonBaseClasses} ${getViewModeButtonClasses('normal')}`}
          style={{
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}
        >
          Radar
        </button>

        {/* Self Button */}
        <button
          data-view-mode="102"
          onClick={() => viewMode !== 'self-only' && onViewModeChange('self-only')}
          disabled={viewMode === 'self-only'}
          className={`${buttonBaseClasses} ${getViewModeButtonClasses('self-only')}`}
          style={{
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}
        >
          Self
        </button>

        {/* Altitude Button */}
        <button
          data-view-mode="103"
          onClick={() => viewMode !== 'hud' && onViewModeChange('hud')}
          disabled={viewMode === 'hud'}
          className={`${buttonBaseClasses} ${getViewModeButtonClasses('hud')}`}
          style={{
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}
        >
          Altitude
        </button>

        {/* Network Members Button */}
        <button
          data-view-mode="104"
          onClick={() =>
            viewMode !== 'aircraft-layout' && onViewModeChange('aircraft-layout')
          }
          disabled={viewMode === 'aircraft-layout'}
          className={`${buttonBaseClasses} ${getViewModeButtonClasses('aircraft-layout')}`}
          style={{
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}
        >
          Network Members
        </button>

        {/* Engagement Button */}
        <button
          data-view-mode="eng"
          onClick={() => viewMode !== 'eng' && onViewModeChange('eng')}
          disabled={viewMode === 'eng'}
          className={`${buttonBaseClasses} ${getViewModeButtonClasses('eng')}`}
          style={{
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}
        >
          Engagement
        </button>

        {/* Map Toggle Button */}
        {!shouldHideMapAndZoom && (
          <button
            data-button="map"
            onClick={toggleMap}
            className={`${buttonBaseClasses} ${
              isMapVisible ? 'bg-[#4488ff]' : 'bg-[#2a2a35]'
            }`}
            style={{
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            }}
          >
            Map
          </button>
        )}
      </div>

      {/* Section 2: Zoom Controls */}
      {!shouldHideMapAndZoom && (
        <div className="flex flex-row items-center gap-1 md:gap-1 w-full justify-center mt-2 md:mt-3 box-border flex-nowrap">
          <button
            onClick={zoomOut}
            disabled={!canZoomOut}
            className="w-[20px] md:w-[24px] h-7 md:h-8 min-w-[20px] md:min-w-[24px] flex-shrink-0 bg-[#2a2a35] text-white rounded cursor-pointer text-sm md:text-lg font-semibold transition-all duration-200 flex items-center justify-center box-border hover:bg-[#3a3a45] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            }}
          >
            −
          </button>

          <div 
            className="text-white font-semibold text-[12px] md:text-[14px] text-center flex-1 min-w-[35px] md:min-w-[42px] max-w-full flex items-center justify-center bg-[#2a2a35] px-1.5 md:px-2 py-1 md:py-1.5 rounded box-border overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            }}
          >
            {currentZoom.toFixed(1)}
          </div>

          <button
            onClick={zoomIn}
            disabled={!canZoomIn}
            className="w-[20px] md:w-[24px] h-7 md:h-8 min-w-[20px] md:min-w-[24px] flex-shrink-0 bg-[#2a2a35] text-white rounded cursor-pointer text-sm md:text-lg font-semibold transition-all duration-200 flex items-center justify-center box-border hover:bg-[#3a3a45] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

