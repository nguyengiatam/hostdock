const pty = require('node-pty');
const os = require('os');
const { getDefaultShell } = require('./shell-detect');

const sessions = new Map();
let idCounter = 0;
const isWin = os.platform() === 'win32';

function ptyOpts(extra) {
  const opts = { name: 'xterm-256color', cols: 120, rows: 30, cwd: os.homedir() };
  if (isWin) {
    opts.useConpty = true;
  } else {
    opts.env = { ...process.env, TERM: 'xterm-256color', LANG: 'en_US.UTF-8' };
    opts.encoding = 'utf8';
  }
  return { ...opts, ...extra };
}

function wire(id, proc, mainWindow, hostName) {
  sessions.set(id, proc);
  proc.onData((data) => mainWindow.webContents.send('terminal:data', { id, data }));
  proc.onExit(({ exitCode }) => {
    sessions.delete(id);
    mainWindow.webContents.send('terminal:exit', { id, code: exitCode });
  });
  return { id, hostName };
}

function findSshPath() {
  if (!isWin) return 'ssh';
  const candidates = [
    process.env.SystemRoot + '\\System32\\OpenSSH\\ssh.exe',
    'C:\\Windows\\System32\\OpenSSH\\ssh.exe',
    'C:\\Program Files\\OpenSSH\\ssh.exe',
    'C:\\Program Files\\Git\\usr\\bin\\ssh.exe',
  ];
  for (const p of candidates) { try { if (require('fs').existsSync(p)) return p; } catch {} }
  // fallback: resolve via where
  try { return require('child_process').execSync('where ssh', { encoding: 'utf-8' }).trim().split('\n')[0].trim(); } catch {}
  return 'ssh.exe';
}

function spawnSession(hostName, mainWindow, password) {
  const id = String(++idCounter);
  let proc;
  if (isWin) {
    proc = pty.spawn(findSshPath(), [hostName], ptyOpts());
  } else {
    const shell = getDefaultShell();
    proc = pty.spawn(shell, ['-c', `ssh ${hostName}`], ptyOpts());
  }

  // Auto-fill password when SSH prompts
  if (password) {
    let filled = false;
    const onData = proc.onData((data) => {
      if (!filled && /password.*:/i.test(data)) {
        filled = true;
        setTimeout(() => proc.write(password + '\r'), 100);
        onData.dispose();
      }
    });
    // Timeout: stop listening after 30s
    setTimeout(() => { if (!filled) onData.dispose(); }, 30000);
  }

  return wire(id, proc, mainWindow, hostName);
}

function spawnLocal(shellPath, mainWindow) {
  const id = String(++idCounter);
  // On Windows, resolve full path if needed
  let resolved = shellPath;
  if (isWin && !require('fs').existsSync(shellPath)) {
    try { resolved = require('child_process').execSync(`where ${shellPath}`, { encoding: 'utf-8' }).trim().split('\n')[0].trim(); } catch {}
  }
  const proc = pty.spawn(resolved, [], ptyOpts());
  return wire(id, proc, mainWindow, 'local');
}

function write(id, data) {
  const proc = sessions.get(id);
  if (proc) proc.write(data);
}

function resize(id, cols, rows) {
  const proc = sessions.get(id);
  if (proc) { try { proc.resize(cols, rows); } catch {} }
}

function kill(id) {
  const proc = sessions.get(id);
  if (proc) { proc.kill(); sessions.delete(id); }
}

module.exports = { spawn: spawnSession, spawnLocal, write, resize, kill };
