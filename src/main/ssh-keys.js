const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const SSH_DIR = path.join(os.homedir(), '.ssh');
const isWin = os.platform() === 'win32';
const nullDev = isWin ? '2>nul' : '2>/dev/null';

function findSshKeygen() {
  if (!isWin) return 'ssh-keygen';
  const candidates = [
    (process.env.SystemRoot || 'C:\\Windows') + '\\System32\\OpenSSH\\ssh-keygen.exe',
    'C:\\Program Files\\Git\\usr\\bin\\ssh-keygen.exe',
  ];
  for (const p of candidates) { if (fs.existsSync(p)) return `"${p}"`; }
  try {
    const r = execSync('where ssh-keygen 2>nul', { encoding: 'utf-8' }).trim().split(/\r?\n/)[0].trim();
    if (r && fs.existsSync(r)) return `"${r}"`;
  } catch {}
  return 'ssh-keygen';
}

const sshKeygen = findSshKeygen();

function listKeys() {
  if (!fs.existsSync(SSH_DIR)) { fs.mkdirSync(SSH_DIR, { mode: 0o700 }); return []; }

  const files = fs.readdirSync(SSH_DIR);
  const pubFiles = files.filter(f => f.endsWith('.pub'));

  return pubFiles.map(pub => {
    const name = pub.replace('.pub', '');
    const pubPath = path.join(SSH_DIR, pub);
    const privPath = path.join(SSH_DIR, name);
    const pubContent = fs.readFileSync(pubPath, 'utf-8').trim();
    const parts = pubContent.split(' ');
    const algo = parts[0] || '';
    const stat = fs.statSync(pubPath);

    let fingerprint = '';
    try {
      fingerprint = execSync(`${sshKeygen} -lf "${pubPath}" ${nullDev}`, { encoding: 'utf-8', timeout: 5000 }).trim();
    } catch {}

    return {
      name,
      algorithm: algo.replace('ssh-', '').toUpperCase(),
      fingerprint,
      created: stat.birthtime || stat.mtime,
      hasPrivate: fs.existsSync(privPath),
      pubPath,
      privPath
    };
  });
}

function generateKey({ name, algorithm = 'ed25519', passphrase = '' }) {
  if (!fs.existsSync(SSH_DIR)) fs.mkdirSync(SSH_DIR, { mode: 0o700 });
  const keyPath = path.join(SSH_DIR, name);
  if (fs.existsSync(keyPath)) return { success: false, error: 'Key already exists' };

  try {
    execSync(`${sshKeygen} -t ${algorithm} -f "${keyPath}" -N "${passphrase}" -C "${name}"`, { encoding: 'utf-8', timeout: 30000 });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.stderr || e.message };
  }
}

function deleteKey(name) {
  const pubPath = path.join(SSH_DIR, `${name}.pub`);
  const privPath = path.join(SSH_DIR, name);
  if (fs.existsSync(pubPath)) fs.unlinkSync(pubPath);
  if (fs.existsSync(privPath)) fs.unlinkSync(privPath);
  return { success: true };
}

function getPublicKey(name) {
  const pubPath = path.join(SSH_DIR, `${name}.pub`);
  if (!fs.existsSync(pubPath)) return { success: false, error: 'Not found' };
  return { success: true, content: fs.readFileSync(pubPath, 'utf-8').trim() };
}

function renameKey(oldName, newName) {
  if (!/^[a-zA-Z0-9\-_.]+$/.test(newName)) return { success: false, error: 'Invalid name. Use only a-z, A-Z, 0-9, -, _, .' };
  const oldPub = path.join(SSH_DIR, `${oldName}.pub`);
  const oldPriv = path.join(SSH_DIR, oldName);
  const newPub = path.join(SSH_DIR, `${newName}.pub`);
  const newPriv = path.join(SSH_DIR, newName);
  if (!fs.existsSync(oldPub)) return { success: false, error: 'Key not found' };
  if (fs.existsSync(newPub) || fs.existsSync(newPriv)) return { success: false, error: 'Target name already exists' };

  fs.renameSync(oldPub, newPub);
  if (fs.existsSync(oldPriv)) fs.renameSync(oldPriv, newPriv);

  // Update ssh config references
  const sshConfig = require('./ssh-config');
  sshConfig.updateIdentityFile(oldName, newName);

  return { success: true };
}

module.exports = { listKeys, generateKey, deleteKey, getPublicKey, renameKey };
