import { useState, useCallback } from 'react';
import { ViewMode } from '../types';

export function useViewMode(initialMode: ViewMode = 'normal') {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);

  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return {
    viewMode,
    setViewMode: changeViewMode,
    isRadarView: viewMode === 'normal',
    isSelfView: viewMode === 'self-only',
    isHUDView: viewMode === 'hud',
    isNetworkView: viewMode === 'aircraft-layout',
    isEngagementView: viewMode === 'eng',
  };
}

