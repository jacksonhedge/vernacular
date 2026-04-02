import { contextBridge, ipcRenderer } from 'electron';

export interface VernacularAPI {
  readMessages: (sinceRowId?: number) => Promise<{ ok: boolean; data?: any[]; error?: string }>;
  sendMessage: (phone: string, text: string) => Promise<{ ok: boolean; error?: string }>;
  onNewMessage: (callback: (messages: any[]) => void) => () => void;
  getStationStatus: () => Promise<{ ok: boolean; data?: any; error?: string }>;
  onStationStatusChanged: (callback: (online: boolean) => void) => () => void;
}

contextBridge.exposeInMainWorld('vernacular', {
  readMessages: (sinceRowId?: number) => {
    return ipcRenderer.invoke('read-chat-db', sinceRowId);
  },

  sendMessage: (phone: string, text: string) => {
    return ipcRenderer.invoke('send-imessage', phone, text);
  },

  onNewMessage: (callback: (messages: any[]) => void) => {
    const handler = (_event: any, messages: any[]) => callback(messages);
    ipcRenderer.on('new-messages', handler);
    return () => ipcRenderer.removeListener('new-messages', handler);
  },

  getStationStatus: () => {
    return ipcRenderer.invoke('get-station-status');
  },

  onStationStatusChanged: (callback: (online: boolean) => void) => {
    const handler = (_event: any, online: boolean) => callback(online);
    ipcRenderer.on('station-status-changed', handler);
    return () => ipcRenderer.removeListener('station-status-changed', handler);
  },
} satisfies VernacularAPI);
