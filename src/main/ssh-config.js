const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const SSH_DIR = path.join(os.homedir(), '.ssh');
const CONFIG_PATH = path.join(SSH_DIR, 'config');

function ensureConfigExists() {
  if (!fs.existsSync(SSH_DIR)) fs.mkdirSync(SSH_DIR, { mode: 0o700 });
  if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, '', { mode: 0o600 });
}

function parseConfig() {
  ensureConfigExists();
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const hosts = [];
  let current = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const hostMatch = line.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      if (current) hosts.push(current);
      current = { Host: hostMatch[1].trim(), _raw: {}, _forwards: [] };
      continue;
    }

    if (current) {
      const m = line.match(/^(\S+)\s+(.+)$/);
      if (m) {
        const key = m[1];
        const val = m[2].trim();
        if (key === 'LocalForward' || key === 'RemoteForward') {
          const parts = val.split(/\s+/);
          current._forwards.push({ type: key === 'LocalForward' ? 'L' : 'R', port: parts[0], target: parts[1] || '' });
        } else {
          current[key] = val;
          current._raw[key] = val;
        }
      }
    }
  }
  if (current) hosts.push(current);
  return hosts;
}

function serializeConfig(hosts) {
  return hosts.map(h => {
    const lines = [`Host ${h.Host}`];
    const skip = new Set(['Host', '_raw', '_forwards']);
    for (const [k, v] of Object.entries(h)) {
      if (skip.has(k) || !v) continue;
      lines.push(`  ${k} ${v}`);
    }
    if (h._forwards) {
      for (const f of h._forwards) {
        const key = f.type === 'L' ? 'LocalForward' : 'RemoteForward';
        lines.push(`  ${key} ${f.port} ${f.target}`);
      }
    }
    return lines.join('\n');
  }).join('\n\n') + '\n';
}

function getHosts() {
  return parseConfig().map(h => ({
    name: h.Host,
    hostname: h.HostName || h.Hostname || '',
    port: h.Port || '22',
    user: h.User || '',
    identityFile: h.IdentityFile || '',
    authType: h.IdentityFile ? 'key' : 'password',
    proxyJump: h.ProxyJump || '',
    forwards: h._forwards || [],
    dynamicForward: h.DynamicForward || '',
    compression: h.Compression || '',
    serverAliveInterval: h.ServerAliveInterval || '',
    serverAliveCountMax: h.ServerAliveCountMax || ''
  }));
}

function getHost(name) {
  return getHosts().find(h => h.name === name) || null;
}

function saveHost(host) {
  const hosts = parseConfig();
  const lookupName = host.originalName || host.name;
  const idx = hosts.findIndex(h => h.Host === lookupName);

  // Parse forwards from form
  let forwards = [];
  try { forwards = JSON.parse(host.forwards || '[]'); } catch { forwards = []; }

  const entry = {
    Host: host.name,
    HostName: host.hostname,
    Port: host.port !== '22' ? host.port : undefined,
    User: host.user,
    IdentityFile: host.identityFile || undefined,
    ProxyJump: host.proxyJump || undefined,
    _forwards: forwards.filter(f => f.port && f.target),
    DynamicForward: host.dynamicForward || undefined,
    Compression: host.compression || undefined,
    ServerAliveInterval: host.serverAliveInterval || undefined,
    ServerAliveCountMax: host.serverAliveCountMax || undefined
  };

  if (idx >= 0) hosts[idx] = entry;
  else hosts.push(entry);

  fs.writeFileSync(CONFIG_PATH, serializeConfig(hosts), { mode: 0o600 });
  return { success: true };
}

function deleteHost(name) {
  const hosts = parseConfig().filter(h => h.Host !== name);
  fs.writeFileSync(CONFIG_PATH, serializeConfig(hosts), { mode: 0o600 });
  return { success: true };
}

function testConnection(name) {
  return new Promise((resolve) => {
    try {
      const result = execSync(
        `ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=no ${name} echo "OK" 2>&1`,
        { timeout: 10000, encoding: 'utf-8' }
      );
      resolve({ success: true, output: result.trim() });
    } catch (e) {
      resolve({ success: false, output: e.stderr || e.message });
    }
  });
}

function updateIdentityFile(oldName, newName) {
  ensureConfigExists();
  let content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(IdentityFile\\s+.*[/\\\\])${escaped}\\s*$`, 'gm');
  const updated = content.replace(regex, `$1${newName}`);
  if (updated !== content) fs.writeFileSync(CONFIG_PATH, updated, { mode: 0o600 });
}

function reorderHosts(order) {
  const hosts = parseConfig();
  const map = new Map(hosts.map(h => [h.Host, h]));
  const sorted = order.map(name => map.get(name)).filter(Boolean);
  // append any hosts not in order list
  hosts.forEach(h => { if (!order.includes(h.Host)) sorted.push(h); });
  fs.writeFileSync(CONFIG_PATH, serializeConfig(sorted), { mode: 0o600 });
  return { success: true };
}

module.exports = { getHosts, getHost, saveHost, deleteHost, testConnection, updateIdentityFile, reorderHosts };
