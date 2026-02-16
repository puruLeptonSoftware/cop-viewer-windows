export interface UDPDataPoint {
  globalId: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  veIn?: number;
  veIe?: number;
  veIu?: number;
  trueHeading?: number;
  heading?: number;
  opcode: 101 | 102;
  callsign?: string;
  callsignId?: number;
  internalData?: {
    isMotherAc: number;
    trackId: number;
  };
  radioData?: any;
  regionalData?: any;
  battleGroupData?: any;
}

export interface EngagementData {
  globalId: number; // attacker
  engagementTargetGid: number; // target
  weaponLaunch: number;
  hangFire: number;
  tth: number; // time to hit
  tta: number; // time to arrival
  engagementTargetWeaponCode: number;
  dMax1: number; // max range 1
  dMax2: number; // max range 2
  dmin: number; // min range
  opcode: 103;
}

export interface TargetData {
  globalId: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  range: number;
  opcode: 104;
}

export interface ThreatData {
  senderGlobalId: number;
  threatId: number;
  isSearchMode: number;
  isLockOn: number;
  threatType: number;
  threatRange: number; // Distance in meters
  threatAzimuth: number; // Angle from true north in degrees
  threatFrequency: number;
  latitude?: number; // Calculated from mother aircraft position
  longitude?: number; // Calculated from mother aircraft position
  opcode: 106;
}

