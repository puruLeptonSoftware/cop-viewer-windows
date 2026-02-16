import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  closeApp: () => ipcRenderer.invoke('close-app'),
});

contextBridge.exposeInMainWorld('udp', {
  onDataFromMain: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners('data-from-main');
    ipcRenderer.on('data-from-main', (_event, data) => {
      try {
        callback(data);
      } catch (e) {
        console.error('udp.onDataFromMain callback error', e);
      }
    });
  },
  onTargetsFromMain: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners('targets-from-main');
    ipcRenderer.on('targets-from-main', (_event, data) => {
      try {
        callback(data);
      } catch (e) {
        console.error('udp.onTargetsFromMain callback error', e);
      }
    });
  },
  onEngagementsFromMain: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners('engagements-from-main');
    ipcRenderer.on('engagements-from-main', (_event, data) => {
      try {
        callback(data);
      } catch (e) {
        console.error('udp.onEngagementsFromMain callback error', e);
      }
    });
  },
  onThreatsFromMain: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners('threats-from-main');
    ipcRenderer.on('threats-from-main', (_event, data) => {
      try {
        callback(data);
      } catch (e) {
        console.error('udp.onThreatsFromMain callback error', e);
      }
    });
  },
});

contextBridge.exposeInMainWorld('udpRequest', {
  requestLatest: () => ipcRenderer.invoke('udp-request-latest'),
  requestTargets: () => ipcRenderer.invoke('udp-request-targets'),
  requestEngagements: () => ipcRenderer.invoke('udp-request-engagements'),
  requestThreats: () => ipcRenderer.invoke('udp-request-threats'),
});

contextBridge.exposeInMainWorld('config', {
  getConfig: () => ipcRenderer.invoke('get-config'),
});

