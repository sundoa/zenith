import { contextBridge } from 'electron';

// Expose safe system info to the React window context
contextBridge.exposeInMainWorld('zenithAPI', {
  platform: process.platform,
  version: '1.0.0',
});
