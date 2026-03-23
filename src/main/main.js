const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const sshConfig = require('./ssh-config');
const sshKeys = require('./ssh-keys');
const sshTerminal = require('./ssh-terminal');
const shellDetect = require('./shell-detect');
const credentials = require('./credentials');

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, '../../build/icon.png');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: iconPath,
    backgroundColor: '#0e0e0e',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0e0e0e',
      symbolColor: '#52fd2e',
      height: 40
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// --- IPC: SSH Config ---
ipcMain.handle('ssh:getHosts', () => sshConfig.getHosts());
ipcMain.handle('ssh:getHost', (_, name) => {
  const host = sshConfig.getHost(name);
  if (host) host.password = credentials.getPassword(name) ? '••••••••' : '';
  return host;
});
ipcMain.handle('ssh:hasPassword', (_, name) => !!credentials.getPassword(name));
ipcMain.handle('ssh:saveHost', (_, host) => {
  // Only update password if user actually changed it (not the masked placeholder)
  if (host.password && host.password !== '••••••••') credentials.setPassword(host.name, host.password);
  else if (host.authMode === 'key') credentials.removePassword(host.name);
  return sshConfig.saveHost(host);
});
ipcMain.handle('ssh:deleteHost', (_, name) => {
  credentials.removePassword(name);
  return sshConfig.deleteHost(name);
});
ipcMain.handle('ssh:testConnection', (_, name) => sshConfig.testConnection(name));
ipcMain.handle('ssh:reorderHosts', (_, order) => sshConfig.reorderHosts(order));

// --- IPC: SSH Keys ---
ipcMain.handle('keys:list', () => sshKeys.listKeys());
ipcMain.handle('keys:generate', (_, opts) => sshKeys.generateKey(opts));
ipcMain.handle('keys:delete', (_, name) => sshKeys.deleteKey(name));
ipcMain.handle('keys:getPublic', (_, name) => sshKeys.getPublicKey(name));
ipcMain.handle('keys:rename', (_, oldName, newName) => sshKeys.renameKey(oldName, newName));

// --- IPC: Terminal ---
ipcMain.handle('terminal:spawn', (_, hostName) => {
  const password = credentials.getPassword(hostName);
  return sshTerminal.spawn(hostName, mainWindow, password);
});
ipcMain.handle('terminal:spawnLocal', (_, shellPath) => sshTerminal.spawnLocal(shellPath, mainWindow));
ipcMain.on('terminal:write', (_, { id, data }) => sshTerminal.write(id, data));
ipcMain.on('terminal:resize', (_, { id, cols, rows }) => sshTerminal.resize(id, cols, rows));
ipcMain.on('terminal:kill', (_, id) => sshTerminal.kill(id));

// --- IPC: Shell Detection ---
ipcMain.handle('shells:detect', () => shellDetect.detectShells());
ipcMain.handle('shells:default', () => shellDetect.getDefaultShell());

// --- IPC: Shell ---
ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url));

// --- IPC: Dialog ---
ipcMain.handle('dialog:openFile', async (_, opts) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: opts?.title || 'Select File',
    defaultPath: opts?.defaultPath || require('os').homedir() + '/.ssh',
    properties: ['openFile', 'showHiddenFiles'],
    filters: opts?.filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});
