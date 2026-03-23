// Terminal page - xterm.js + node-pty
(function() {
  const sessions = []; // { id, hostName, connected, term, fitAddon, mounted, dataDispose }
  let activeSessionId = null;
  let ipcSetup = false;

  window.addEventListener('page:load', (e) => {
    if (e.detail !== 'terminal') return;
    render();
    if (!ipcSetup) { setupIPC(); ipcSetup = true; }
  });

  window.addEventListener('terminal:connect', (e) => connectToHost(e.detail));

  function setupIPC() {
    window.api.onTerminalData(({ id, data }) => {
      const s = sessions.find(s => s.id === id);
      if (s?.term) s.term.write(data);
    });
    window.api.onTerminalExit(({ id, code }) => {
      const s = sessions.find(s => s.id === id);
      if (s) {
        s.connected = false;
        if (s.term) s.term.write(`\r\n\x1b[31m[Session ended with code ${code}]\x1b[0m\r\n`);
        updateTabStates();
      }
    });
  }

  function getSettings() {
    try { return JSON.parse(localStorage.getItem('ssh-manager-settings')) || {}; } catch { return {}; }
  }

  function createXterm() {
    const s = getSettings();
    const term = new Terminal({
      cursorBlink: true, cursorStyle: s.cursorStyle || 'block',
      fontFamily: s.fontFamily ? `'${s.fontFamily}', monospace` : "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: s.fontSize || 14, lineHeight: parseFloat(s.lineHeight) || 1.4,
      scrollback: s.scrollbackLines || 10000,
      allowProposedApi: true,
      theme: {
        background: '#0e0e0e', foreground: '#e0e0e0',
        cursor: '#52fd2e', cursorAccent: '#0e0e0e', selectionBackground: '#52fd2e33',
        black: '#0e0e0e', red: '#ff7351', green: '#52fd2e', yellow: '#f0c674',
        blue: '#679cff', magenta: '#b294bb', cyan: '#97f8ff', white: '#ffffff',
        brightBlack: '#767575', brightRed: '#ff7351', brightGreen: '#52fd2e', brightYellow: '#f0c674',
        brightBlue: '#679cff', brightMagenta: '#b294bb', brightCyan: '#97f8ff', brightWhite: '#ffffff',
      }
    });
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);

    let pasting = false;
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown' || e.repeat) return true;
      if (e.ctrlKey && e.key === 'c' && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection());
        term.clearSelection();
        return false;
      }
      if (e.ctrlKey && e.key === 'v' && !pasting) {
        pasting = true;
        e.preventDefault();
        navigator.clipboard.readText().then(t => { term.paste(t); setTimeout(() => pasting = false, 100); });
        return false;
      }
      return true;
    });

    return { term, fitAddon };
  }

  async function connectToHost(hostName) {
    if (!ipcSetup) { setupIPC(); ipcSetup = true; }
    // Create xterm FIRST so it can receive data immediately
    const { term, fitAddon } = createXterm();
    const session = { id: null, hostName, connected: true, term, fitAddon, mounted: false };
    sessions.push(session);

    // Wire input once (before mount, onData works after open)
    term.onData((data) => {
      if (session.connected && session.id) window.api.writeTerminal(session.id, data);
    });

    // Now spawn - any data arriving will be written to term buffer
    const result = await window.api.spawnTerminal(hostName);
    session.id = result.id;
    session.hostName = result.hostName;
    activeSessionId = result.id;
    render();
  }

  async function openLocalShell(shellPath, shellName) {
    if (!ipcSetup) { setupIPC(); ipcSetup = true; }
    const { term, fitAddon } = createXterm();
    const session = { id: null, hostName: shellName || 'local', connected: true, term, fitAddon, mounted: false };
    sessions.push(session);

    term.onData((data) => {
      if (session.connected && session.id) window.api.writeTerminal(session.id, data);
    });

    const result = await window.api.spawnLocalTerminal(shellPath);
    session.id = result.id;
    activeSessionId = result.id;
    render();
  }

  function mountTerminal() {
    const s = sessions.find(s => s.id === activeSessionId);
    const container = document.getElementById('xterm-container');
    if (!s || !container) return;

    // Detach previous observer
    if (s._resizeObs) s._resizeObs.disconnect();

    container.innerHTML = '';
    s.term.open(container);
    s.term.textarea?.addEventListener('paste', (e) => e.preventDefault());

    // Delay fit to ensure container has layout dimensions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          s.fitAddon.fit();
          const dim = s.fitAddon.proposeDimensions();
          if (dim && s.id) window.api.resizeTerminal(s.id, dim.cols, dim.rows);
        } catch {}
        s.term.focus();
      });
    });

    s.mounted = true;

    // ResizeObserver with debounce for multi-monitor moves
    let resizeTimer;
    s._resizeObs = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        requestAnimationFrame(() => {
          try {
            s.fitAddon.fit();
            const dim = s.fitAddon.proposeDimensions();
            if (dim && s.id) window.api.resizeTerminal(s.id, dim.cols, dim.rows);
          } catch {}
        });
      }, 50);
    });
    s._resizeObs.observe(container);
  }

  function updateTabStates() {
    sessions.forEach(s => {
      const dot = document.querySelector(`[data-tab-dot="${s.id}"]`);
      if (dot) dot.className = `w-1.5 h-1.5 rounded-full ${s.connected ? 'bg-primary' : 'bg-error'}`;
    });
  }

  function render() {
    const page = document.getElementById('page-terminal');

    if (sessions.length === 0) {
      page.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <pre class="font-mono text-primary/80 text-xs mb-6">
 ██╗  ██╗ ██████╗ ███████╗████████╗██████╗  ██████╗  ██████╗██╗  ██╗
 ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝
 ███████║██║   ██║███████╗   ██║   ██║  ██║██║   ██║██║     █████╔╝
 ██╔══██║██║   ██║╚════██║   ██║   ██║  ██║██║   ██║██║     ██╔═██╗
 ██║  ██║╚██████╔╝███████║   ██║   ██████╔╝╚██████╔╝╚██████╗██║  ██╗
 ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝</pre>
          <h2 class="font-headline text-xl text-on-surface-variant mb-2">NO ACTIVE SESSIONS</h2>
          <p class="text-sm text-outline-variant font-mono mb-8">Connect to a host or open a local shell</p>
          <div class="flex gap-4">
            <button onclick="document.querySelector('[data-page=hosts]').click()"
              class="px-6 py-2 bg-primary/10 text-primary border border-primary/20 font-mono text-xs uppercase hover:bg-primary/20 active:scale-[0.98] transition-all">
              VIEW HOSTS
            </button>
            <button onclick="terminalPage.showLocalShellPicker()"
              class="px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-bold text-xs tracking-widest uppercase rounded-md active:scale-95 transition-transform">
              LOCAL SHELL
            </button>
          </div>
        </div>`;
      return;
    }

    const active = sessions.find(s => s.id === activeSessionId);
    page.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Tab Bar -->
        <div class="flex items-center bg-surface-container-lowest border-b border-outline-variant/10 px-2 pt-1 shrink-0">
          <div class="flex items-end gap-1">
            ${sessions.map(s => `
              <button onclick="terminalPage.switchTab('${s.id}')"
                class="flex items-center gap-2 px-4 py-2 text-[10px] font-mono rounded-t-sm transition-colors
                ${s.id === activeSessionId
                  ? 'border-t-2 border-primary bg-surface-container-low text-primary'
                  : 'border-t-2 border-transparent bg-transparent text-on-surface-variant hover:bg-surface-container/30'}">
                <span data-tab-dot="${s.id}" class="w-1.5 h-1.5 rounded-full ${s.connected ? 'bg-primary' : 'bg-error'}"></span>
                ${s.hostName}
                <span class="material-symbols-outlined text-[12px] opacity-60 hover:opacity-100"
                  onclick="event.stopPropagation(); terminalPage.closeTab('${s.id}')">close</span>
              </button>
            `).join('')}
          </div>
          <div class="flex items-center ml-2 mb-1 gap-1">
            <button onclick="document.querySelector('[data-page=hosts]').click()"
              class="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-sm transition-all" title="SSH Connect">
              <span class="material-symbols-outlined text-lg">add</span>
            </button>
            <!-- Shell dropdown (like VS Code) -->
            <div class="relative" id="shell-dropdown-wrap">
              <button onclick="terminalPage.toggleShellDropdown()"
                class="flex items-center gap-1 p-1 text-on-surface-variant hover:text-tertiary hover:bg-surface-container rounded-sm transition-all" title="New Terminal">
                <span class="material-symbols-outlined text-lg">terminal</span>
                <span class="material-symbols-outlined text-[10px]">arrow_drop_down</span>
              </button>
              <div id="shell-dropdown" class="hidden absolute top-full left-0 mt-1 w-56 bg-surface-container-high border border-outline-variant/20 shadow-xl z-50">
                <div class="py-1" id="shell-dropdown-items">
                  <div class="px-3 py-1.5 text-[9px] font-mono text-on-surface-variant uppercase tracking-widest">Detected Shells</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Session Header -->
        <div class="flex items-center justify-between px-6 py-2 bg-surface-container-low shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full ${active?.connected ? 'bg-primary animate-pulse' : 'bg-error'}"></div>
            <span class="font-mono text-xs text-primary">SESSION ${active?.connected ? 'ACTIVE' : 'CLOSED'}: ${active?.hostName || ''}</span>
          </div>
        </div>

        <!-- xterm.js container -->
        <div id="xterm-container" class="flex-1 min-h-0 overflow-hidden bg-[#0e0e0e]"></div>

        <!-- Toolbar -->
        <div class="bg-surface-container p-2 flex items-center justify-between border-t border-outline-variant/10 shrink-0">
          <div class="flex gap-1">
            ${['ESC','TAB','CTRL-C'].map(k => `
              <button onclick="terminalPage.sendSpecial('${k}')"
                class="px-3 py-1 bg-surface-container-high border border-outline-variant/20 rounded-sm text-[10px] font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">${k}</button>
            `).join('')}
          </div>
          <div class="flex items-center gap-4 pr-2">
            <button onclick="terminalPage.disconnect()" class="flex items-center gap-1 text-[10px] font-mono text-on-surface-variant hover:text-error uppercase">
              <span class="material-symbols-outlined text-sm">power_settings_new</span>DISCONNECT
            </button>
          </div>
        </div>
      </div>`;

    requestAnimationFrame(() => mountTerminal());
  }

  let cachedShells = null;

  window.terminalPage = {
    switchTab(id) {
      const prev = sessions.find(s => s.id === activeSessionId);
      if (prev?._resizeObs) prev._resizeObs.disconnect();
      activeSessionId = id;
      render();
    },
    closeTab(id) {
      window.api.killTerminal(id);
      const s = sessions.find(s => s.id === id);
      if (s) {
        if (s._resizeObs) s._resizeObs.disconnect();
        s.term.dispose();
        sessions.splice(sessions.indexOf(s), 1);
      }
      if (activeSessionId === id) activeSessionId = sessions.length ? sessions[sessions.length - 1].id : null;
      render();
    },
    sendSpecial(key) {
      const s = sessions.find(s => s.id === activeSessionId);
      if (!s) return;
      const map = { 'ESC': '\x1b', 'TAB': '\t', 'CTRL-C': '\x03' };
      if (map[key]) { window.api.writeTerminal(s.id, map[key]); s.term.focus(); }
    },
    disconnect() { if (activeSessionId) this.closeTab(activeSessionId); },

    async toggleShellDropdown() {
      const dd = document.getElementById('shell-dropdown');
      if (!dd) return;
      if (!dd.classList.contains('hidden')) { dd.classList.add('hidden'); return; }

      // Load shells once
      if (!cachedShells) {
        cachedShells = await window.api.detectShells();
        cachedShells._default = await window.api.getDefaultShell();
      }
      const items = document.getElementById('shell-dropdown-items');
      items.innerHTML = `
        <div class="px-3 py-1.5 text-[9px] font-mono text-on-surface-variant uppercase tracking-widest">Detected Shells</div>
        ${cachedShells.map((s, i) => `
          <button data-shell-idx="${i}"
            class="shell-launch-btn w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-primary/10 transition-colors">
            <span class="material-symbols-outlined text-sm ${s.path === cachedShells._default ? 'text-primary' : 'text-on-surface-variant'}">terminal</span>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-on-surface">${s.name}</span>
                ${s.path === cachedShells._default ? '<span class="text-[8px] text-primary font-mono">DEFAULT</span>' : ''}
              </div>
              <span class="text-[9px] text-on-surface-variant font-mono truncate block">${s.path}</span>
            </div>
          </button>
        `).join('')}
      `;
      // Bind click via event delegation (avoids backslash issues in inline onclick)
      items.querySelectorAll('.shell-launch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sh = cachedShells[btn.dataset.shellIdx];
          if (sh) terminalPage.launchLocal(sh.path, sh.name);
        });
      });
      dd.classList.remove('hidden');
      const close = (e) => { if (!document.getElementById('shell-dropdown-wrap')?.contains(e.target)) { dd.classList.add('hidden'); document.removeEventListener('click', close); } };
      setTimeout(() => document.addEventListener('click', close), 0);
    },

    async showLocalShellPicker() {
      const shells = await window.api.detectShells();
      const defaultShell = await window.api.getDefaultShell();
      showModal(`
        <div class="p-6">
          <h2 class="font-headline text-xl font-bold mb-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-tertiary">terminal</span>
            OPEN LOCAL SHELL
          </h2>
          <p class="text-xs text-on-surface-variant mb-6 font-mono">Detected shells on this system</p>
          <div class="space-y-2" id="modal-shell-list">
            ${shells.map((s, i) => `
              <button data-modal-shell-idx="${i}"
                class="modal-shell-btn w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container transition-colors text-left group relative">
                <div class="absolute left-0 top-0 bottom-0 w-1 ${s.path === defaultShell ? 'bg-primary' : 'bg-secondary'}"></div>
                <div class="ml-3">
                  <div class="flex items-center gap-3">
                    <span class="font-headline font-bold text-sm uppercase">${s.name}</span>
                    ${s.path === defaultShell ? '<span class="text-[9px] px-2 py-0.5 border border-primary/30 text-primary font-mono">DEFAULT</span>' : ''}
                  </div>
                  <p class="font-mono text-[10px] text-on-surface-variant mt-1">${s.path}</p>
                  ${s.version ? `<p class="font-mono text-[9px] text-outline-variant mt-0.5">${s.version}</p>` : ''}
                </div>
                <span class="text-xs text-on-surface-variant font-body">${s.desc}</span>
              </button>
            `).join('')}
            ${shells.length === 0 ? '<p class="text-sm text-on-surface-variant text-center py-4">No shells detected</p>' : ''}
          </div>
          <div class="flex justify-end mt-6 pt-4 border-t border-outline-variant/10">
            <button onclick="hideModal()" class="px-6 py-2 border border-outline-variant text-on-surface-variant font-label text-xs tracking-widest uppercase hover:bg-surface-container-high transition-colors">CANCEL</button>
          </div>
        </div>`);
      // Bind clicks safely
      document.querySelectorAll('.modal-shell-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sh = shells[btn.dataset.modalShellIdx];
          if (sh) { hideModal(); terminalPage.launchLocal(sh.path, sh.name); }
        });
      });
    },
    async launchLocal(shellPath, shellName) {
      document.getElementById('shell-dropdown')?.classList.add('hidden');
      hideModal();
      await openLocalShell(shellPath, shellName);
    }
  };
})();
