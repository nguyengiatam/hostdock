const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // SSH Config
  getHosts: () => ipcRenderer.invoke('ssh:getHosts'),
  getHost: (name) => ipcRenderer.invoke('ssh:getHost', name),
  saveHost: (host) => ipcRenderer.invoke('ssh:saveHost', host),
  deleteHost: (name) => ipcRenderer.invoke('ssh:deleteHost', name),
  testConnection: (name) => ipcRenderer.invoke('ssh:testConnection', name),
  reorderHosts: (order) => ipcRenderer.invoke('ssh:reorderHosts', order),

  // SSH Keys
  listKeys: () => ipcRenderer.invoke('keys:list'),
  generateKey: (opts) => ipcRenderer.invoke('keys:generate', opts),
  deleteKey: (name) => ipcRenderer.invoke('keys:delete', name),
  getPublicKey: (name) => ipcRenderer.invoke('keys:getPublic', name),
  renameKey: (oldName, newName) => ipcRenderer.invoke('keys:rename', oldName, newName),

  // Terminal
  spawnTerminal: (hostName) => ipcRenderer.invoke('terminal:spawn', hostName),
  spawnLocalTerminal: (shellPath) => ipcRenderer.invoke('terminal:spawnLocal', shellPath),
  writeTerminal: (id, data) => ipcRenderer.send('terminal:write', { id, data }),
  resizeTerminal: (id, cols, rows) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
  killTerminal: (id) => ipcRenderer.send('terminal:kill', id),
  onTerminalData: (cb) => {
    ipcRenderer.on('terminal:data', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('terminal:data');
  },
  onTerminalExit: (cb) => {
    ipcRenderer.on('terminal:exit', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('terminal:exit');
  },

  // Shell Detection
  detectShells: () => ipcRenderer.invoke('shells:detect'),
  getDefaultShell: () => ipcRenderer.invoke('shells:default'),

  // Dialog
  openFileDialog: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
});
