import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ViewMode } from '../types';

interface MapContextType {
  isMapVisible: boolean;
  toggleMap: () => void;
  setMapVisible: (visible: boolean) => void;
  zoomLevel: {
    radar: number;
    self: number;
  };
  center: {
    radar: [number, number];
    self: [number, number];
  };
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (level: number) => void;
  setCenter: (center: [number, number]) => void;
  panEnabled: boolean;
  viewMode: ViewMode;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
  viewMode: ViewMode;
}

// Safe default center (India)
const DEFAULT_CENTER: [number, number] = [78.9629, 20.5937];
const DEFAULT_ZOOM = 3.5;
const MAX_ZOOM = 18;
const MIN_ZOOM = 1;

export function MapProvider({ children, viewMode }: MapProviderProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState({
    radar: DEFAULT_ZOOM,
    self: DEFAULT_ZOOM,
  });
  const [center, setCenterState] = useState<{
    radar: [number, number];
    self: [number, number];
  }>({
    radar: DEFAULT_CENTER,
    self: DEFAULT_CENTER,
  });

  const toggleMap = useCallback(() => {
    setIsMapVisible((prev) => !prev);
  }, []);

  const setMapVisible = useCallback((visible: boolean) => {
    setIsMapVisible(visible);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => {
      if (viewMode === 'self-only') {
        return {
          ...prev,
          self: Math.min(prev.self + 1, MAX_ZOOM),
        };
      } else {
        return {
          ...prev,
          radar: Math.min(prev.radar + 1, MAX_ZOOM),
        };
      }
    });
  }, [viewMode]);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      if (viewMode === 'self-only') {
        return {
          ...prev,
          self: Math.max(prev.self - 1, MIN_ZOOM),
        };
      } else {
        return {
          ...prev,
          radar: Math.max(prev.radar - 1, MIN_ZOOM),
        };
      }
    });
  }, [viewMode]);

  const setZoom = useCallback(
    (level: number) => {
      setZoomLevel((prev) => {
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
        if (viewMode === 'self-only') {
          return {
            ...prev,
            self: clampedZoom,
          };
        } else {
          return {
            ...prev,
            radar: clampedZoom,
          };
        }
      });
    },
    [viewMode]
  );

  const setCenter = useCallback(
    (newCenter: [number, number]) => {
      setCenterState((prev) => {
        if (viewMode === 'self-only') {
          return {
            ...prev,
            self: newCenter,
          };
        } else {
          return {
            ...prev,
            radar: newCenter,
          };
        }
      });
    },
    [viewMode]
  );

  const panEnabled = viewMode === 'normal';

  const value: MapContextType = {
    isMapVisible,
    toggleMap,
    setMapVisible,
    zoomLevel: {
      radar: zoomLevel.radar,
      self: zoomLevel.self,
    },
    center: {
      radar: center.radar,
      self: center.self,
    },
    zoomIn,
    zoomOut,
    setZoom,
    setCenter,
    panEnabled,
    viewMode,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMap() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
}

