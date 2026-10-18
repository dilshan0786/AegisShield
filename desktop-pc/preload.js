const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aegisAPI', {
  getState: () => ipcRenderer.invoke('get-state'),
  setupMasterPassword: (password) => ipcRenderer.invoke('setup-master-password', password),
  verifyPassword: (password) => ipcRenderer.invoke('verify-password', password),
  changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('change-password', { oldPassword, newPassword }),
  toggleProtection: (password, enabled) => ipcRenderer.invoke('toggle-protection', { password, enabled }),
  updateSettings: (password, settings) => ipcRenderer.invoke('update-settings', { password, settings }),
  updateCinemaSettings: (settings) => ipcRenderer.invoke('update-cinema-settings', settings),
  authorizeAndExit: (password) => ipcRenderer.invoke('authorize-and-exit', password),
  applyHostsFilter: () => ipcRenderer.invoke('apply-hosts-filter'),
  triggerNudityOverlay: () => ipcRenderer.invoke('trigger-nudity-overlay'),
  onThreatIntercepted: (callback) => ipcRenderer.on('threat-intercepted', (_event, threat) => callback(threat)),
  onPromptExitDialog: (callback) => ipcRenderer.on('prompt-exit-dialog', () => callback())
});
