// Hosts page - matches design 01-danh-sach-host-ssh.html
(function() {
  let hosts = [];
  let searchFilter = '';

  window.addEventListener('page:load', async (e) => {
    if (e.detail !== 'hosts') return;
    await loadHosts();
  });

  async function loadHosts() {
    hosts = await window.api.getHosts();
    render();
  }

  function render() {
    const filtered = searchFilter
      ? hosts.filter(h => `${h.name} ${h.hostname} ${h.user}`.toLowerCase().includes(searchFilter))
      : hosts;
    const page = document.getElementById('page-hosts');
    page.innerHTML = `
      <div class="p-8 h-full flex flex-col">
        <!-- Header -->
        <div class="flex items-baseline justify-between mb-8 shrink-0">
          <div>
            <h2 class="font-headline text-4xl font-bold tracking-tight text-white mb-2">ACTIVE INSTANCES</h2>
            <p class="text-on-surface-variant font-mono text-[10px] tracking-[0.3em]">TOTAL NODES: ${filtered.length} // HOSTDOCK</p>
          </div>
          <div class="flex items-center gap-4">
            <button onclick="hostsPage.showAddModal()"
              class="px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-bold text-[10px] tracking-widest uppercase rounded-md active:scale-95 transition-transform">
              + NEW HOST
            </button>
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span class="font-mono text-[10px] text-primary">SYSTEM READY</span>
            </div>
          </div>
        </div>

        ${filtered.length === 0 ? emptyState() : `
        <!-- Host Table -->
        <div class="flex-1 min-h-0 overflow-y-auto">
          <table class="w-full">
            <thead class="sticky top-0 bg-surface z-10">
              <tr class="text-left font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">
                <th class="py-3 pr-4 font-normal">Host</th>
                <th class="py-3 px-4 font-normal">Address</th>
                <th class="py-3 px-4 font-normal w-28">User</th>
                <th class="py-3 px-4 font-normal w-32">Auth Type</th>
                <th class="py-3 px-4 font-normal hidden lg:table-cell">Key</th>
                <th class="py-3 pl-4 font-normal text-right w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((h, i) => hostRow(h, i)).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>
    `;
  }

  function emptyState() {
    return `
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <span class="material-symbols-outlined text-7xl text-surface-container-highest mb-6">dns</span>
        <h2 class="font-headline text-2xl font-bold text-on-surface-variant mb-2 tracking-tight">NO HOSTS CONFIGURED</h2>
        <p class="text-sm text-outline-variant mb-8 font-mono">Add your first SSH host to ~/.ssh/config</p>
        <button onclick="hostsPage.showAddModal()"
          class="bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-bold text-sm tracking-widest py-3 px-8 rounded-md active:scale-95 transition-transform uppercase">
          NEW CONNECTION
        </button>
      </div>
    `;
  }

  function hostRow(host, idx) {
    const isKey = host.authType === 'key';
    return `
      <tr class="border-t border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors cursor-pointer group"
          draggable="true" data-idx="${idx}"
          ondragstart="hostsPage.onDragStart(event)" ondragover="hostsPage.onDragOver(event)" ondrop="hostsPage.onDrop(event)"
          ondragend="document.querySelectorAll('.drag-above,.drag-below,[style*=opacity]').forEach(el=>{el.classList.remove('drag-above','drag-below');el.style.opacity=''})"
          onclick="hostsPage.editHost('${host.name}')">
        <td class="py-3 pr-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-outline-variant/40 text-sm cursor-grab active:cursor-grabbing">drag_indicator</span>
            <div class="w-1 h-6 ${isKey ? 'bg-secondary' : 'bg-primary'}"></div>
            <span class="font-headline text-sm font-bold uppercase">${host.name}</span>
          </div>
        </td>
        <td class="py-3 px-4 font-mono text-xs text-on-surface-variant">${host.hostname || 'N/A'}:${host.port || '22'}</td>
        <td class="py-3 px-4 font-mono text-xs">${host.user || '—'}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1.5 font-mono text-xs">
            <span class="material-symbols-outlined text-[14px]">${isKey ? 'vpn_key' : 'lock'}</span>
            ${isKey ? 'SSH KEY' : 'PASSWORD'}
          </span>
        </td>
        <td class="py-3 px-4 font-mono text-[10px] text-on-surface-variant truncate max-w-[150px] hidden lg:table-cell">${host.identityFile || '—'}</td>
        <td class="py-3 pl-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="event.stopPropagation(); hostsPage.connectHost('${host.name}')"
              class="px-4 py-1.5 bg-surface-container-highest text-primary font-mono text-[10px] font-bold border border-outline-variant/20 hover:border-primary/50 transition-all">
              SSH CONNECT
            </button>
            <button onclick="event.stopPropagation(); hostsPage.deleteHost('${host.name}')"
              class="p-1.5 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function hostFormHtml(host = null) {
    const h = host || { name:'', hostname:'', port:'22', user:'', identityFile:'', password:'',
      forwards: [], dynamicForward:'', compression:'', serverAliveInterval:'', serverAliveCountMax:'' };
    const isEdit = !!host;
    const authMode = h.identityFile ? 'key' : (h.password ? 'password' : 'key');
    // Store forwards in a temp var for the form
    window._hostForwards = Array.isArray(h.forwards) ? [...h.forwards] : [];
    return `
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-8">
          <h2 class="font-headline text-xl font-bold tracking-tight uppercase flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary">database</span>
            ${isEdit ? 'EDIT HOST' : 'NEW CONNECTION'}
          </h2>
          <span class="text-[10px] font-mono text-outline-variant">${isEdit ? 'ID: ' + h.name : ''}</span>
        </div>
        <form id="host-form" class="space-y-6">
          <input type="hidden" name="authMode" id="auth-mode-val" value="${authMode}"/>
          ${isEdit ? `<input type="hidden" name="originalName" value="${h.name}"/>` : ''}

          <!-- Host Alias -->
          <div>
            <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">Host Alias</label>
            <input name="name" value="${h.name}"
              class="w-full bg-transparent border-b border-outline-variant focus:border-primary transition-colors text-primary font-mono text-lg py-2 focus:ring-0 outline-none" required/>
          </div>
          <div class="grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">Hostname / IP</label>
              <input name="hostname" value="${h.hostname}"
                class="w-full bg-transparent border-b border-outline-variant focus:border-primary transition-colors text-on-surface font-mono py-2 focus:ring-0 outline-none" placeholder="192.168.1.1" required/>
            </div>
            <div>
              <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">Port</label>
              <input name="port" value="${h.port}"
                class="w-full bg-transparent border-b border-outline-variant focus:border-primary transition-colors text-on-surface font-mono py-2 focus:ring-0 outline-none" placeholder="22"/>
            </div>
            <div>
              <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">User</label>
              <input name="user" value="${h.user}"
                class="w-full bg-transparent border-b border-outline-variant focus:border-primary transition-colors text-on-surface font-mono py-2 focus:ring-0 outline-none" placeholder="root"/>
            </div>

            <!-- Authentication Method -->
            <div>
              <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">Authentication Method</label>
              <div class="flex items-center gap-1 p-1 bg-surface-container rounded-sm border border-outline-variant/10 mb-3">
                <button type="button" id="auth-tab-key" onclick="hostsPage.setAuthMode('key')"
                  class="flex-1 py-1.5 text-[10px] font-mono uppercase border-b-2 transition-colors ${authMode === 'key' ? 'text-primary border-primary bg-primary/5' : 'text-on-surface-variant border-transparent hover:text-on-surface'}">SSH Key</button>
                <button type="button" id="auth-tab-password" onclick="hostsPage.setAuthMode('password')"
                  class="flex-1 py-1.5 text-[10px] font-mono uppercase border-b-2 transition-colors ${authMode === 'password' ? 'text-primary border-primary bg-primary/5' : 'text-on-surface-variant border-transparent hover:text-on-surface'}">Password</button>
              </div>
              <!-- Key input -->
              <div id="auth-key-view" class="${authMode === 'key' ? '' : 'hidden'}">
                <div class="relative group/file">
                  <input name="identityFile" id="identity-file-input" value="${h.identityFile}" readonly
                    class="w-full bg-transparent border-b border-outline-variant group-hover/file:border-secondary transition-colors text-on-surface font-mono py-2 cursor-default focus:ring-0 outline-none pr-10" placeholder="~/.ssh/id_ed25519"/>
                  <span class="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant group-hover/file:text-secondary cursor-pointer"
                    onclick="hostsPage.browseKeyFile()">folder_open</span>
                </div>
              </div>
              <!-- Password input -->
              <div id="auth-password-view" class="${authMode === 'password' ? '' : 'hidden'}">
                <div class="relative">
                  <input name="password" id="password-input" type="password" value="${h.password || ''}"
                    class="w-full bg-transparent border-b border-outline-variant focus:border-primary transition-colors text-on-surface font-mono py-2 focus:ring-0 outline-none pr-10" placeholder="••••••••"/>
                  <span class="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant cursor-pointer hover:text-primary"
                    onclick="hostsPage.togglePasswordVisibility()">visibility</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tunneling -->
          <details class="mt-2">
            <summary class="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-tertiary">vibration</span>
              SSH Tunneling & Advanced
            </summary>
            <div class="space-y-6 mt-6">
              <input type="hidden" name="forwards" id="forwards-json" value='${JSON.stringify(window._hostForwards)}'/>

              <!-- Tunnel list + add button -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-[10px] font-mono text-tertiary uppercase tracking-widest">Port Forwarding</span>
                  <div class="relative" id="tunnel-add-wrap">
                    <button type="button" onclick="hostsPage.toggleTunnelMenu()"
                      class="flex items-center gap-1 px-3 py-1.5 bg-surface-container-high border border-outline-variant/20 text-[10px] font-mono text-on-surface-variant hover:text-tertiary hover:border-tertiary/30 transition-colors">
                      <span class="material-symbols-outlined text-sm">add</span> ADD TUNNEL
                    </button>
                    <div id="tunnel-add-menu" class="hidden absolute right-0 top-full mt-1 w-48 bg-surface-container-high border border-outline-variant/20 shadow-xl z-50">
                      <button type="button" onclick="hostsPage.addTunnel('L')"
                        class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-tertiary/10 transition-colors">
                        <span class="text-[10px] font-mono font-bold text-tertiary px-1.5 py-0.5 border border-tertiary/30">-L</span>
                        <div>
                          <div class="text-xs font-mono text-on-surface">Local Forward</div>
                          <div class="text-[9px] text-on-surface-variant">LOCAL → REMOTE</div>
                        </div>
                      </button>
                      <button type="button" onclick="hostsPage.addTunnel('R')"
                        class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/10 transition-colors border-t border-outline-variant/10">
                        <span class="text-[10px] font-mono font-bold text-secondary px-1.5 py-0.5 border border-secondary/30">-R</span>
                        <div>
                          <div class="text-xs font-mono text-on-surface">Remote Forward</div>
                          <div class="text-[9px] text-on-surface-variant">REMOTE → LOCAL</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                <div id="tunnel-list" class="space-y-2">
                  ${window._hostForwards.length === 0 ? '<p class="text-[10px] text-on-surface-variant/50 font-mono text-center py-3">No tunnels configured</p>' : ''}
                </div>
              </div>

              <!-- Dynamic Forward -->
              <div class="flex items-center justify-between p-4 bg-surface-container rounded-sm border border-outline-variant/10">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-mono font-bold text-primary/70 px-2 py-0.5 border border-primary/20 rounded-sm">-D</span>
                  <div>
                    <div class="text-[10px] font-mono text-on-surface uppercase">Dynamic SOCKS Proxy</div>
                    <div class="text-[9px] text-on-surface-variant">ssh -D port</div>
                  </div>
                </div>
                <input name="dynamicForward" value="${h.dynamicForward}"
                  class="w-20 bg-surface-container-lowest border border-outline-variant/20 font-mono text-xs py-2 px-3 text-center focus:border-primary focus:ring-0 outline-none" placeholder="1080"/>
              </div>

              <!-- Advanced -->
              <div class="grid grid-cols-2 gap-x-8 gap-y-6 pt-4 border-t border-outline-variant/10">
                <div>
                  <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">Compression</label>
                  <select name="compression" class="w-full bg-surface-container border-outline-variant text-on-surface font-mono text-sm py-2 px-3 focus:ring-primary/20 focus:border-primary">
                    <option value="" ${!h.compression ? 'selected' : ''}>Default</option>
                    <option value="yes" ${h.compression === 'yes' ? 'selected' : ''}>Yes</option>
                    <option value="no" ${h.compression === 'no' ? 'selected' : ''}>No</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">ServerAliveInterval</label>
                  <input name="serverAliveInterval" value="${h.serverAliveInterval}"
                    class="w-full bg-transparent border-b border-outline-variant focus:border-primary transition-colors text-on-surface font-mono py-2 focus:ring-0 outline-none" placeholder="60"/>
                </div>
                <div>
                  <label class="block text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] mb-2">ServerAliveCountMax</label>
                  <input name="serverAliveCountMax" value="${h.serverAliveCountMax}"
                    class="w-full bg-transparent border-b border-outline-variant focus:border-primary transition-colors text-on-surface font-mono py-2 focus:ring-0 outline-none" placeholder="3"/>
                </div>
              </div>
            </div>
          </details>

          <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-outline-variant/10">
            <button type="button" onclick="hideModal()"
              class="px-6 py-3 border border-outline-variant hover:bg-surface-container-high text-on-surface-variant font-headline font-bold tracking-widest text-xs uppercase rounded-md transition-all">
              CANCEL
            </button>
            <button type="submit"
              class="px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-extrabold tracking-widest text-xs uppercase rounded-md shadow-[0_0_24px_rgba(82,253,46,0.1)] hover:brightness-110 active:scale-95 transition-all">
              ${isEdit ? 'SAVE CONFIG' : 'CREATE HOST'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  window.hostsPage = {
    search(q) { searchFilter = q.toLowerCase(); render(); },
    _dragIdx: null,
    onDragStart(e) {
      this._dragIdx = +e.currentTarget.dataset.idx;
      e.currentTarget.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const tr = e.currentTarget;
      const rect = tr.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      // Remove all indicators first
      document.querySelectorAll('.drag-above,.drag-below').forEach(el => { el.classList.remove('drag-above','drag-below'); });
      if (e.clientY < mid) tr.classList.add('drag-above');
      else tr.classList.add('drag-below');
    },
    async onDrop(e) {
      e.preventDefault();
      document.querySelectorAll('.drag-above,.drag-below,[style*=opacity]').forEach(el => {
        el.classList.remove('drag-above','drag-below'); el.style.opacity = '';
      });
      const from = this._dragIdx;
      const tr = e.currentTarget;
      const rect = tr.getBoundingClientRect();
      let to = +tr.dataset.idx;
      if (e.clientY >= rect.top + rect.height / 2) to++;
      if (from === null || from === to || from + 1 === to) return;
      if (to > from) to--;
      const item = hosts.splice(from, 1)[0];
      hosts.splice(to, 0, item);
      await window.api.reorderHosts(hosts.map(h => h.name));
      render();
    },
    setAuthMode(mode) {
      document.getElementById('auth-mode-val').value = mode;
      const keyView = document.getElementById('auth-key-view');
      const passView = document.getElementById('auth-password-view');
      const tabKey = document.getElementById('auth-tab-key');
      const tabPass = document.getElementById('auth-tab-password');
      const active = 'text-primary border-primary bg-primary/5';
      const inactive = 'text-on-surface-variant border-transparent hover:text-on-surface';
      if (mode === 'key') {
        keyView.classList.remove('hidden'); passView.classList.add('hidden');
        tabKey.className = tabKey.className.replace(/text-\S+|border-\S+|bg-\S+|hover:\S+/g, '').trim() + ' flex-1 py-1.5 text-[10px] font-mono uppercase border-b-2 transition-colors ' + active;
        tabPass.className = tabPass.className.replace(/text-\S+|border-\S+|bg-\S+|hover:\S+/g, '').trim() + ' flex-1 py-1.5 text-[10px] font-mono uppercase border-b-2 transition-colors ' + inactive;
      } else {
        passView.classList.remove('hidden'); keyView.classList.add('hidden');
        tabPass.className = tabPass.className.replace(/text-\S+|border-\S+|bg-\S+|hover:\S+/g, '').trim() + ' flex-1 py-1.5 text-[10px] font-mono uppercase border-b-2 transition-colors ' + active;
        tabKey.className = tabKey.className.replace(/text-\S+|border-\S+|bg-\S+|hover:\S+/g, '').trim() + ' flex-1 py-1.5 text-[10px] font-mono uppercase border-b-2 transition-colors ' + inactive;
      }
    },
    async browseKeyFile() {
      const filePath = await window.api.openFileDialog({ title: 'Select SSH Key' });
      if (filePath) document.getElementById('identity-file-input').value = filePath;
    },
    togglePasswordVisibility() {
      const input = document.getElementById('password-input');
      const icon = input?.nextElementSibling;
      if (input.type === 'password') { input.type = 'text'; icon.textContent = 'visibility_off'; }
      else { input.type = 'password'; icon.textContent = 'visibility'; }
    },
    toggleTunnelMenu() {
      const menu = document.getElementById('tunnel-add-menu');
      if (!menu) return;
      menu.classList.toggle('hidden');
      if (!menu.classList.contains('hidden')) {
        const close = (e) => { if (!document.getElementById('tunnel-add-wrap')?.contains(e.target)) { menu.classList.add('hidden'); document.removeEventListener('click', close); } };
        setTimeout(() => document.addEventListener('click', close), 0);
      }
    },
    addTunnel(type) {
      document.getElementById('tunnel-add-menu')?.classList.add('hidden');
      window._hostForwards.push({ type, port: '', target: '' });
      this.renderTunnels();
    },
    removeTunnel(idx) {
      window._hostForwards.splice(idx, 1);
      this.renderTunnels();
    },
    updateTunnel(idx, field, value) {
      window._hostForwards[idx][field] = value;
      document.getElementById('forwards-json').value = JSON.stringify(window._hostForwards);
    },
    renderTunnels() {
      const list = document.getElementById('tunnel-list');
      const json = document.getElementById('forwards-json');
      if (!list) return;
      json.value = JSON.stringify(window._hostForwards);
      if (window._hostForwards.length === 0) {
        list.innerHTML = '<p class="text-[10px] text-on-surface-variant/50 font-mono text-center py-3">No tunnels configured</p>';
        return;
      }
      list.innerHTML = window._hostForwards.map((f, i) => {
        const isL = f.type === 'L';
        const color = isL ? 'tertiary' : 'secondary';
        const srcLabel = isL ? 'Local Port' : 'Remote Port';
        const dstLabel = isL ? 'Remote Host:Port' : 'Local Host:Port';
        const arrow = isL ? 'arrow_forward' : 'arrow_back';
        return `
          <div class="flex items-center gap-2 p-3 bg-surface-container rounded-sm border border-outline-variant/10 group">
            <span class="text-[10px] font-mono font-bold text-${color} px-1.5 py-0.5 border border-${color}/30 shrink-0">-${f.type}</span>
            <input value="${f.port}" placeholder="${srcLabel}" oninput="hostsPage.updateTunnel(${i},'port',this.value)"
              class="w-20 bg-surface-container-lowest border border-outline-variant/20 font-mono text-xs py-1.5 px-2 focus:border-${color} focus:ring-0 outline-none"/>
            <span class="material-symbols-outlined text-on-surface-variant/40 text-sm shrink-0">${arrow}</span>
            <input value="${f.target}" placeholder="${dstLabel}" oninput="hostsPage.updateTunnel(${i},'target',this.value)"
              class="flex-1 bg-surface-container-lowest border border-outline-variant/20 font-mono text-xs py-1.5 px-2 focus:border-${color} focus:ring-0 outline-none"/>
            <button type="button" onclick="hostsPage.removeTunnel(${i})"
              class="p-1 text-on-surface-variant/40 hover:text-error transition-colors opacity-0 group-hover:opacity-100 shrink-0">
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>`;
      }).join('');
    },
    showAddModal() {
      showModal(hostFormHtml());
      this.renderTunnels();
      document.getElementById('host-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await window.api.saveHost(Object.fromEntries(fd));
        hideModal();
        await loadHosts();
      });
    },
    async editHost(name) {
      const host = await window.api.getHost(name);
      if (!host) return;
      showModal(hostFormHtml(host));
      this.renderTunnels();
      document.getElementById('host-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await window.api.saveHost(Object.fromEntries(fd));
        hideModal();
        await loadHosts();
      });
    },
    async deleteHost(name) {
      showModal(`
        <div class="p-6">
          <h2 class="font-headline font-bold text-lg uppercase tracking-wide text-error mb-2">CONFIRM DELETE</h2>
          <p class="text-sm text-on-surface-variant mb-6">Remove <span class="font-mono text-white">${name}</span> from SSH config?</p>
          <div class="flex justify-end gap-3">
            <button onclick="hideModal()" class="px-6 py-2 border border-outline-variant text-on-surface-variant font-label text-xs tracking-widest uppercase hover:bg-surface-container-high transition-colors">CANCEL</button>
            <button onclick="hostsPage.confirmDelete('${name}')" class="px-6 py-2 bg-error-container text-on-error-container font-label text-xs font-bold tracking-widest uppercase">DELETE HOST</button>
          </div>
        </div>
      `);
    },
    async confirmDelete(name) {
      await window.api.deleteHost(name);
      hideModal();
      await loadHosts();
    },
    connectHost(name) {
      document.querySelector('[data-page="terminal"]').click();
      setTimeout(() => window.dispatchEvent(new CustomEvent('terminal:connect', { detail: name })), 100);
    }
  };
})();
