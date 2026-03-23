const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function detectShells() {
  const platform = os.platform();
  const shells = [];

  if (platform === 'win32') {
    // Windows shells
    const candidates = [
      { name: 'PowerShell', bin: 'powershell.exe', desc: 'Windows PowerShell' },
      { name: 'pwsh', bin: 'pwsh.exe', desc: 'PowerShell Core' },
      { name: 'cmd', bin: 'cmd.exe', desc: 'Command Prompt' },
      { name: 'bash', bin: 'C:\\Program Files\\Git\\bin\\bash.exe', desc: 'Git Bash' },
      { name: 'wsl', bin: 'wsl.exe', desc: 'Windows Subsystem for Linux' },
    ];
    for (const c of candidates) {
      try {
        const out = execSync(`where ${path.basename(c.bin)} 2>nul`, { encoding: 'utf-8', timeout: 3000 }).trim();
        const resolved = out.split(/\r?\n/)[0].trim();
        if (resolved && fs.existsSync(resolved)) {
          shells.push({ name: c.name, path: resolved, desc: c.desc });
        }
      } catch {
        if (fs.existsSync(c.bin)) shells.push({ name: c.name, path: c.bin, desc: c.desc });
      }
    }
  } else {
    // Unix: parse /etc/shells + check common paths
    const etcShells = new Set();
    try {
      const content = fs.readFileSync('/etc/shells', 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) etcShells.add(trimmed);
      }
    } catch {}

    const knownShells = [
      { name: 'zsh', desc: 'Z Shell' },
      { name: 'bash', desc: 'Bourne Again Shell' },
      { name: 'fish', desc: 'Friendly Interactive Shell' },
      { name: 'sh', desc: 'Bourne Shell' },
      { name: 'dash', desc: 'Debian Almquist Shell' },
      { name: 'tmux', desc: 'Terminal Multiplexer' },
    ];

    for (const s of knownShells) {
      try {
        const resolved = execSync(`which ${s.name} 2>/dev/null`, { encoding: 'utf-8' }).trim();
        if (resolved) {
          let version = '';
          try { version = execSync(`${resolved} --version 2>&1`, { encoding: 'utf-8', timeout: 2000 }).trim().split('\n')[0]; } catch {}
          shells.push({ name: s.name, path: resolved, desc: s.desc, version, inEtcShells: etcShells.has(resolved) });
        }
      } catch {}
    }
  }

  return shells;
}

function getDefaultShell() {
  if (os.platform() === 'win32') {
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

module.exports = { detectShells, getDefaultShell };
