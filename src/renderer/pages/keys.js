// Keys page - matches design 02-quan-ly-khoa-ssh.html
(function() {
  let keys = [];

  window.addEventListener('page:load', async (e) => {
    if (e.detail !== 'keys') return;
    await loadKeys();
  });

  async function loadKeys() {
    try {
      keys = await window.api.listKeys();
    } catch (e) {
      console.error('Failed to load keys:', e);
      keys = [];
    }
    render();
  }

  function render() {
    const page = document.getElementById('page-keys');
    page.innerHTML = `
      <div class="p-8 pb-12">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-end mb-12 mt-8">
          <div class="max-w-2xl">
            <h1 class="font-headline text-5xl font-bold tracking-tighter mb-4">KEY VAULT</h1>
            <p class="text-on-surface-variant font-body leading-relaxed max-w-lg">
              Manage your cryptographic identities. Securely store and provision SSH keys for production architecture.
            </p>
          </div>
          <div class="flex gap-4 mt-6 md:mt-0">
            <button onclick="keysPage.showImportInfo()"
              class="px-6 py-2 bg-surface-container text-primary font-label text-xs tracking-widest border border-outline-variant hover:bg-surface-container-high transition-colors uppercase">
              IMPORT EXISTING
            </button>
            <button onclick="keysPage.showGenerateModal()"
              class="px-6 py-2 bg-primary text-on-primary font-label text-xs font-bold tracking-widest rounded-md hover:bg-primary-dim transition-colors uppercase">
              GENERATE PAIR
            </button>
          </div>
        </div>

        <!-- Security Warning -->
        <div class="mb-12 p-4 bg-error-container/10 border-l-4 border-error flex items-start gap-4">
          <span class="material-symbols-outlined text-error">warning</span>
          <div>
            <p class="text-error font-headline font-bold text-sm tracking-wide uppercase">Security Protocol Alert</p>
            <p class="text-on-error-container text-xs mt-1 font-body">Private keys should never be shared or stored in unencrypted environments.</p>
          </div>
        </div>

        <!-- Bento Grid -->
        <div class="grid grid-cols-12 gap-6">
          <!-- Key List -->
          <div class="col-span-12 lg:col-span-8 space-y-6">
            <div class="flex items-center justify-between mb-2 px-2">
              <h3 class="font-mono text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">ACTIVE IDENTITIES (${keys.length})</h3>
              <span class="text-primary font-mono text-[10px]">SYNC STATUS: OK</span>
            </div>
            ${keys.length === 0 ? emptyState() : keys.map(keyCard).join('')}
          </div>

          <!-- Generate Panel -->
          <div class="col-span-12 lg:col-span-4 space-y-6">
            ${generatePanel()}
            ${securityMetrics()}
          </div>
        </div>
      </div>
    `;
  }

  function emptyState() {
    return `
      <div class="bg-surface-container-low p-12 text-center">
        <span class="material-symbols-outlined text-6xl text-surface-container-highest mb-4">vpn_key</span>
        <h2 class="font-headline text-xl text-on-surface-variant mb-2">NO KEYS FOUND</h2>
        <p class="text-sm text-outline-variant font-mono mb-6">Generate or import SSH keys</p>
      </div>
    `;
  }

  function keyCard(key) {
    const isWeak = key.algorithm.includes('RSA') && !key.algorithm.includes('4096');
    const isEd = key.algorithm.includes('ED25519');
    const icon = isWeak ? 'gpp_maybe' : (isEd ? 'fingerprint' : 'key');
    const iconColor = isWeak ? 'text-error' : 'text-secondary';
    const iconBg = isWeak ? 'bg-error/10' : 'bg-surface-container-highest';
    const barColor = isWeak ? 'bg-error' : 'bg-secondary';

    return `
      <div class="group relative bg-surface-container-low p-5 flex items-center justify-between transition-all hover:bg-surface-container">
        <div class="absolute left-0 top-0 bottom-0 w-1 ${barColor}"></div>
        <div class="flex items-center gap-5">
          <div class="p-3 ${iconBg} rounded-md">
            <span class="material-symbols-outlined ${iconColor}">${icon}</span>
          </div>
          <div>
            <div class="flex items-center gap-3">
              <span class="font-headline font-bold text-lg ${isWeak ? 'text-error' : ''}">${key.name}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-sm border border-outline-variant/30 ${isWeak ? 'text-error' : 'text-on-surface-variant'} font-mono">${key.algorithm}</span>
            </div>
            <p class="font-mono text-xs text-on-surface-variant mt-1">${key.fingerprint || '—'}</p>
          </div>
        </div>
        <div class="text-right hidden sm:block">
          ${isWeak ? '<span class="text-[9px] text-error font-bold uppercase mb-1 block">Weak Algorithm</span>' :
            '<p class="text-[10px] font-mono text-on-surface-variant uppercase mb-1">Created</p>'}
          <p class="text-xs font-mono">${new Date(key.created).toLocaleDateString()}</p>
        </div>
        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onclick="keysPage.showRenameModal('${key.name}')" class="p-2 hover:text-tertiary transition-colors" title="Rename">
            <span class="material-symbols-outlined text-sm">edit</span>
          </button>
          <button onclick="keysPage.copyPublic('${key.name}')" class="p-2 hover:text-primary transition-colors" title="Copy public key">
            <span class="material-symbols-outlined text-sm">content_copy</span>
          </button>
          <button onclick="keysPage.deleteKey('${key.name}')" class="p-2 hover:text-error transition-colors" title="Delete">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    `;
  }

  function generatePanel() {
    return `
      <div class="bg-surface-container p-6 rounded-md shadow-[0_24px_48px_rgba(0,0,0,0.5)] border border-outline-variant/10">
        <h2 class="font-headline text-xl font-bold mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">add_circle</span>
          GENERATE NEW KEY
        </h2>
        <form id="keygen-form-inline" class="space-y-6">
          <div>
            <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-2 tracking-widest">KEY NAME</label>
            <input name="name" required
              class="w-full bg-surface-container-low border-b-2 border-outline-variant focus:border-primary focus:ring-0 font-mono text-sm py-2 transition-all"
              placeholder="id_ed25519_prod"/>
          </div>
          <div>
            <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-2 tracking-widest">ALGORITHM</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="cursor-pointer">
                <input type="radio" name="algorithm" value="ed25519" checked class="hidden peer"/>
                <div class="peer-checked:border-primary peer-checked:text-primary peer-checked:bg-primary/5 px-3 py-2 text-xs font-mono border border-outline-variant text-on-surface-variant text-center transition-all">ED25519</div>
              </label>
              <label class="cursor-pointer">
                <input type="radio" name="algorithm" value="rsa" class="hidden peer"/>
                <div class="peer-checked:border-primary peer-checked:text-primary peer-checked:bg-primary/5 px-3 py-2 text-xs font-mono border border-outline-variant text-on-surface-variant hover:border-on-surface-variant text-center transition-all">RSA 4096</div>
              </label>
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-2 tracking-widest">PASSPHRASE</label>
            <div class="relative">
              <input name="passphrase" type="password"
                class="w-full bg-surface-container-low border-b-2 border-outline-variant focus:border-primary focus:ring-0 font-mono text-sm py-2 transition-all"
                placeholder="••••••••••••••••"/>
            </div>
          </div>
          <div class="pt-4">
            <button type="submit"
              class="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm tracking-widest uppercase rounded-md shadow-[0_0_20px_rgba(82,253,46,0.2)] active:scale-95 transition-transform">
              INITIATE GENERATION
            </button>
          </div>
        </form>
      </div>
    `;
  }

  function securityMetrics() {
    const strong = keys.filter(k => k.algorithm.includes('ED25519') || k.algorithm.includes('4096')).length;
    const pct = keys.length > 0 ? Math.round((strong / keys.length) * 100) : 0;
    return `
      <div class="bg-surface-container-low p-6 rounded-md">
        <h4 class="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-4">SECURITY METRICS</h4>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-xs font-body text-on-surface-variant">Global Key Strength</span>
            <span class="text-xs font-mono text-primary">${pct >= 80 ? 'OPTIMAL' : pct >= 50 ? 'MODERATE' : 'WEAK'}</span>
          </div>
          <div class="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <div class="h-full bg-primary shadow-[0_0_8px_#52fd2e]" style="width:${pct}%"></div>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-xs font-body text-on-surface-variant">Strong Keys</span>
            <span class="text-xs font-mono">${strong}/${keys.length}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Bind inline form after render
  const observer = new MutationObserver(() => {
    const form = document.getElementById('keygen-form-inline');
    if (form && !form.dataset.bound) {
      form.dataset.bound = 'true';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const opts = Object.fromEntries(fd);
        if (opts.algorithm === 'rsa') opts.algorithm = 'rsa -b 4096';
        const result = await window.api.generateKey(opts);
        if (!result.success) {
          showModal(`<div class="p-6"><p class="text-error font-mono">${result.error}</p>
            <button onclick="hideModal()" class="mt-4 px-6 py-2 border border-outline-variant text-on-surface-variant font-label text-xs uppercase">OK</button></div>`);
        }
        await loadKeys();
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.keysPage = {
    showRenameModal(name) {
      showModal(`
        <div class="p-6">
          <h2 class="font-headline font-bold text-lg uppercase tracking-wide text-tertiary mb-4">RENAME KEY</h2>
          <p class="text-sm text-on-surface-variant mb-1">Current name:</p>
          <p class="font-mono text-white mb-4">${name}</p>
          <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-2">New Name</label>
          <input id="rename-key-input" type="text" value="${name}" pattern="[a-zA-Z0-9\\-_.]+"
            class="w-full bg-surface-container-lowest border border-outline-variant font-mono text-sm text-primary py-2 px-3 mb-1 focus:border-primary focus:ring-0"/>
          <p class="text-[10px] text-on-surface-variant mb-4">Only a-z, A-Z, 0-9, -, _, . allowed</p>
          <p id="rename-key-error" class="text-xs text-error mb-3 hidden"></p>
          <div class="flex justify-end gap-3">
            <button onclick="hideModal()" class="px-5 py-2 text-on-surface-variant font-label text-xs tracking-widest uppercase hover:text-on-surface">CANCEL</button>
            <button onclick="keysPage.confirmRename('${name}')" class="px-5 py-2 bg-tertiary text-on-primary font-label text-xs font-bold tracking-widest uppercase">RENAME</button>
          </div>
        </div>
      `);
      setTimeout(() => { const el = document.getElementById('rename-key-input'); el.select(); }, 50);
    },
    async confirmRename(oldName) {
      const newName = document.getElementById('rename-key-input').value.trim();
      const errEl = document.getElementById('rename-key-error');
      if (!newName || newName === oldName) { hideModal(); return; }
      if (!/^[a-zA-Z0-9\-_.]+$/.test(newName)) {
        errEl.textContent = 'Invalid characters in name'; errEl.classList.remove('hidden'); return;
      }
      const result = await window.api.renameKey(oldName, newName);
      if (!result.success) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
      hideModal();
      showToast(`Key renamed to ${newName}`);
      await loadKeys();
    },
    showGenerateModal() {
      // Scroll to inline form
      const form = document.getElementById('keygen-form-inline');
      if (form) { form.querySelector('input[name="name"]').focus(); return; }
    },
    async copyPublic(name) {
      const result = await window.api.getPublicKey(name);
      if (result.success) {
        await navigator.clipboard.writeText(result.content);
        showToast('Public key copied to clipboard');
      }
    },
    deleteKey(name) {
      showModal(`
        <div class="p-6">
          <h2 class="font-headline font-bold text-lg uppercase tracking-wide text-error mb-2">DELETE KEY</h2>
          <p class="text-sm text-on-surface-variant mb-1">Permanently delete private and public key files for:</p>
          <p class="font-mono text-white mb-6">${name}</p>
          <div class="flex justify-end gap-3">
            <button onclick="hideModal()" class="px-6 py-2 border border-outline-variant text-on-surface-variant font-label text-xs tracking-widest uppercase">CANCEL</button>
            <button onclick="keysPage.confirmDelete('${name}')" class="px-6 py-2 bg-error-container text-on-error-container font-label text-xs font-bold tracking-widest uppercase">DELETE KEY</button>
          </div>
        </div>
      `);
    },
    async confirmDelete(name) {
      await window.api.deleteKey(name);
      hideModal();
      await loadKeys();
    },
    showImportInfo() {
      showModal(`
        <div class="p-6">
          <h2 class="font-headline font-bold text-lg uppercase tracking-wide mb-4">IMPORT KEY</h2>
          <p class="text-sm text-on-surface-variant mb-4">Copy your key files directly into <span class="font-mono text-primary">~/.ssh/</span></p>
          <p class="text-xs text-outline-variant mb-6 font-mono">Ensure private key permissions are set to 600.</p>
          <button onclick="hideModal()" class="px-6 py-2 bg-primary text-on-primary font-label text-xs font-bold tracking-widest uppercase rounded-md">GOT IT</button>
        </div>
      `);
    }
  };
})();
