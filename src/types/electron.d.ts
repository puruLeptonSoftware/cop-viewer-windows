export interface ElectronAPI {
  platform: string;
  closeApp: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

