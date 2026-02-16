import type { UDPDataPoint, EngagementData, ThreatData } from './udp';
import type { TargetData } from '../hooks/useGetTargets';

declare global {
  interface Window {
    udp?: {
      onDataFromMain: (callback: (data: UDPDataPoint[]) => void) => void;
      onTargetsFromMain: (callback: (data: TargetData[]) => void) => void;
      onEngagementsFromMain: (callback: (data: EngagementData[]) => void) => void;
      onThreatsFromMain: (callback: (data: ThreatData[]) => void) => void;
    };
    udpRequest?: {
      requestLatest: () => Promise<UDPDataPoint[]>;
      requestTargets: () => Promise<TargetData[]>;
      requestEngagements: () => Promise<EngagementData[]>;
      requestThreats: () => Promise<ThreatData[]>;
    };
    config?: {
      getConfig: () => Promise<{ ip?: string; port?: string } | null>;
    };
  }
}

