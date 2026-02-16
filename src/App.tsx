import { AppLayout } from './components/Layout/AppLayout';
import { RadarMapView } from './components/MainArea/RadarView/radarMapView';
import { RadarView } from './components/MainArea/RadarView/RadarView';
import { RadarMapView as SelfRadarMapView } from './components/MainArea/SelfView/RadarMapView';
import { RadarView as SelfRadarView } from './components/MainArea/SelfView/RadarView';
import { Altitude } from './components/MainArea/Altitude/Altitude';
import { NetworkMembers } from './components/MainArea/NetworkMembers/NetworkMembers';
import Engagement from './components/MainArea/Engagement/Engagement';
import { useViewMode } from './hooks/useViewMode';
import { MapProvider, useMap } from './contexts/MapContext';

// Wrapper component that conditionally renders based on isMapVisible
// This ensures only ONE Map component exists at a time, preventing WebGL context leaks
function ViewContent() {
  const { viewMode, isMapVisible } = useMap();

  // Altitude view doesn't need map
  if (viewMode === 'hud') {
    return <Altitude />;
  }

  // Network Members view doesn't need map
  if (viewMode === 'aircraft-layout') {
    return <NetworkMembers />;
  }

  // Engagement view doesn't need map
  if (viewMode === 'eng') {
    return <Engagement />;
  }

  return (
    <div className="relative w-full h-full bg-[#000000]">
      {viewMode === 'self-only' ? (
        // Self view - conditionally render only one component
        isMapVisible ? (
          <SelfRadarMapView key="self-map" />
        ) : (
          <SelfRadarView key="self-radar" />
        )
      ) : (
        // Normal radar view - conditionally render only one component
        isMapVisible ? (
          <RadarMapView key="radar-map" />
        ) : (
          <RadarView key="radar-view" />
        )
      )}
    </div>
  );
}

function App() {
  const { viewMode, setViewMode } = useViewMode('normal');

  return (
    <MapProvider viewMode={viewMode}>
      <AppLayout viewMode={viewMode} onViewModeChange={setViewMode}>
        <ViewContent />
      </AppLayout>
    </MapProvider>
  );
}

export default App;

