import { ReactNode } from 'react';
import { RightSidebar } from '../Sidebar/RightSidebar';
import { ViewMode } from '../../types';

interface AppLayoutProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  children: ReactNode;
}

export function AppLayout({
  viewMode,
  onViewModeChange,
  children,
}: AppLayoutProps) {
  return (
    <div className="w-full h-screen relative bg-[#000000] overflow-hidden">
      {/* Main Visualization Area */}
      <div className="absolute top-0 left-0 w-[calc(100%-130px)] md:w-[calc(100%-150px)] h-full bg-[#000000] overflow-hidden">
        {children}
      </div>

      {/* Right Sidebar */}
      <RightSidebar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </div>
  );
}

