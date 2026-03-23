const { safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CRED_PATH = path.join(os.homedir(), '.ssh', '.ssh-manager-creds.json');

function load() {
  try { return JSON.parse(fs.readFileSync(CRED_PATH, 'utf-8')); } catch { return {}; }
}

function save(data) {
  fs.writeFileSync(CRED_PATH, JSON.stringify(data), { mode: 0o600 });
}

function setPassword(hostName, password) {
  if (!password) { removePassword(hostName); return; }
  const data = load();
  if (safeStorage.isEncryptionAvailable()) {
    data[hostName] = safeStorage.encryptString(password).toString('base64');
  } else {
    data[hostName] = Buffer.from(password).toString('base64');
  }
  save(data);
}

function getPassword(hostName) {
  const data = load();
  if (!data[hostName]) return null;
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(data[hostName], 'base64'));
    }
    return Buffer.from(data[hostName], 'base64').toString();
  } catch { return null; }
}

function removePassword(hostName) {
  const data = load();
  delete data[hostName];
  save(data);
}

module.exports = { setPassword, getPassword, removePassword };
