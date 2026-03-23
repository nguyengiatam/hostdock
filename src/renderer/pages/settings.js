// Settings page - auto-detect shells, matches design 05
(function() {
  const SETTINGS_KEY = 'ssh-manager-settings';
  let detectedShells = [];

  function applyCustomColor(hex) {
    const dim = '#' + [1,3,5].map(i => Math.round(parseInt(hex.slice(i,i+2),16)*0.78).toString(16).padStart(2,'0')).join('');
    const dark = '#' + [1,3,5].map(i => Math.round(parseInt(hex.slice(i,i+2),16)*0.3).toString(16).padStart(2,'0')).join('');
    const el = document.documentElement;
    el.removeAttribute('data-theme');
    ['primary','primary-fixed','surface-tint'].forEach(k => el.style.setProperty('--c-'+k, hex));
    ['primary-dim','primary-container','primary-fixed-dim'].forEach(k => el.style.setProperty('--c-'+k, dim));
    ['on-primary','on-primary-fixed'].forEach(k => el.style.setProperty('--c-'+k, dark));
    el.style.setProperty('--c-on-primary-container', hex);
  }

  function applyTextColors(s) {
    const el = document.documentElement;
    if (s.textColor) { el.style.setProperty('--c-on-surface', s.textColor); el.style.setProperty('--c-on-background', s.textColor); }
    if (s.textDimColor) el.style.setProperty('--c-on-surface-variant', s.textDimColor);
    if (s.buttonTextColor) { el.style.setProperty('--c-on-primary', s.buttonTextColor); el.style.setProperty('--c-on-primary-container', s.buttonTextColor); }
  }

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || defaults(); } catch { return defaults(); }
  }
  function defaults() {
    return { shell: '', fontFamily: 'JetBrains Mono', fontSize: 14, lineHeight: '1.5', cursorStyle: 'block', copyOnSelect: true, scrollbackLines: 10000, theme: 'green' };
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  window.addEventListener('page:load', async (e) => {
    if (e.detail !== 'settings') return;
    detectedShells = await window.api.detectShells();
    const defaultShell = await window.api.getDefaultShell();
    const s = getSettings();
    if (!s.shell) { s.shell = defaultShell; saveSettings(s); }
    render();
  });

  function render() {
    const s = getSettings();
    const page = document.getElementById('page-settings');
    page.innerHTML = `
      <div class="p-8 lg:p-12 max-w-5xl mx-auto">
        <header class="mb-12">
          <h1 class="text-4xl md:text-5xl font-bold font-headline tracking-tighter text-on-surface mb-2">SYSTEM SETTINGS</h1>
          <div class="h-1 w-24 bg-primary mb-4"></div>
          <p class="text-on-surface-variant font-body max-w-xl">Configure core terminal emulation behavior, rendering engines, and shell environment variables.</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
          <!-- Left Column -->
          <div class="md:col-span-7 space-y-8">
            <!-- Shell Default -->
            <section class="bg-surface-container-low p-6 rounded-sm relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
              <h3 class="font-headline font-bold text-xs tracking-widest text-primary uppercase mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">terminal</span>Shell Default
              </h3>
              <select id="set-shell-select" onchange="settingsPage.setShell(this.value)"
                class="w-full bg-surface-container border border-outline-variant/20 text-on-surface font-mono text-sm py-3 px-4 focus:ring-primary/20 focus:border-primary">
                ${detectedShells.map(sh => `<option value="${sh.path}" ${s.shell === sh.path ? 'selected' : ''}>${sh.name} — ${sh.path}</option>`).join('')}
              </select>
              <p class="mt-2 text-[10px] text-on-surface-variant/60 font-mono uppercase">Auto-detected from system. Used for new terminal sessions.</p>
            </section>

            <!-- Shell Path -->
            <section class="bg-surface-container-low p-6 rounded-sm relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              <h3 class="font-headline font-bold text-xs tracking-widest text-primary uppercase mb-4">Shell Path</h3>
              <input id="set-shell-path" type="text" value="${s.shell}"
                class="w-full bg-surface-container-lowest border-b border-outline-variant focus:border-primary focus:ring-0 font-mono text-primary py-3 px-4 transition-all"
                onchange="settingsPage.setShell(this.value)"/>
              <p class="mt-2 text-[10px] text-on-surface-variant/60 font-mono uppercase">Full executable path. Override auto-detected shell if needed.</p>
            </section>

            <!-- Behavior -->
            <section class="bg-surface-container-low p-6 rounded-sm">
              <h3 class="font-headline font-bold text-xs tracking-widest text-primary uppercase mb-6">Behavior Settings</h3>
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-body text-sm font-medium text-on-surface">Scrollback Buffer</p>
                    <p class="text-xs text-on-surface-variant">Number of lines kept in session memory</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <input id="set-scrollback" type="number" value="${s.scrollbackLines}" min="100" max="50000"
                      class="w-24 bg-surface-container-lowest border-outline-variant focus:border-primary focus:ring-0 font-mono text-sm text-right px-2 py-1"
                      onchange="settingsPage.save()"/>
                    <span class="text-[10px] text-on-surface-variant font-mono uppercase">Lines</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-body text-sm font-medium text-on-surface">Copy on Select</p>
                    <p class="text-xs text-on-surface-variant">Automatically copy selected text to clipboard</p>
                  </div>
                  <button onclick="settingsPage.toggleCopy()"
                    class="w-12 h-6 ${s.copyOnSelect ? 'bg-primary-container' : 'bg-surface-container-high'} rounded-full relative flex items-center px-1 transition-colors border border-outline-variant/30">
                    <div class="w-4 h-4 ${s.copyOnSelect ? 'bg-on-primary-container translate-x-6' : 'bg-on-surface-variant translate-x-0'} rounded-full transition-transform"></div>
                  </button>
                </div>
              </div>
            </section>

            <!-- Color Theme -->
            <section class="bg-surface-container-low p-6 rounded-sm">
              <h3 class="font-headline font-bold text-xs tracking-widest text-primary uppercase mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">palette</span>Color Theme
              </h3>
              <p class="text-[10px] text-on-surface-variant font-mono uppercase mb-3">Accent Color</p>
              <div class="flex flex-wrap gap-3 mb-6">
                ${[
                  { id: 'green', color: '#52fd2e', label: 'Matrix' },
                  { id: 'cyan', color: '#00e5ff', label: 'Cyan' },
                  { id: 'purple', color: '#d0a0ff', label: 'Purple' },
                  { id: 'orange', color: '#ffab40', label: 'Amber' },
                  { id: 'red', color: '#ff5252', label: 'Red' },
                ].map(t => `
                  <button onclick="settingsPage.setTheme('${t.id}')"
                    class="flex flex-col items-center gap-1.5 p-3 rounded-md border transition-all ${s.theme === t.id ? 'border-primary bg-surface-container-high' : 'border-outline-variant/20 hover:border-on-surface-variant/40'}">
                    <div class="w-8 h-8 rounded-full" style="background:${t.color}"></div>
                    <span class="text-[10px] font-mono uppercase ${s.theme === t.id ? 'text-primary' : 'text-on-surface-variant'}">${t.label}</span>
                  </button>
                `).join('')}
                <button onclick="settingsPage.setTheme('custom')"
                  class="flex flex-col items-center gap-1.5 p-3 rounded-md border transition-all ${s.theme === 'custom' ? 'border-primary bg-surface-container-high' : 'border-outline-variant/20 hover:border-on-surface-variant/40'}">
                  <label class="w-8 h-8 rounded-full border-2 border-dashed border-outline-variant cursor-pointer overflow-hidden relative">
                    <input type="color" value="${s.customColor || '#52fd2e'}"
                      class="absolute inset-0 w-[200%] h-[200%] cursor-pointer border-none p-0 -translate-x-1/4 -translate-y-1/4"
                      oninput="settingsPage.setCustomColor(this.value)"/>
                  </label>
                  <span class="text-[10px] font-mono uppercase ${s.theme === 'custom' ? 'text-primary' : 'text-on-surface-variant'}">Custom</span>
                </button>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <p class="text-[10px] text-on-surface-variant font-mono uppercase mb-2">Text Color</p>
                  <div class="flex items-center gap-3">
                    <input type="color" value="${s.textColor || '#ffffff'}" onchange="settingsPage.setTextColor(this.value)"
                      class="w-8 h-8 rounded cursor-pointer border border-outline-variant bg-transparent p-0"/>
                    <span class="font-mono text-xs text-on-surface-variant">${s.textColor || '#ffffff'}</span>
                  </div>
                </div>
                <div>
                  <p class="text-[10px] text-on-surface-variant font-mono uppercase mb-2">Secondary Text</p>
                  <div class="flex items-center gap-3">
                    <input type="color" value="${s.textDimColor || '#adaaaa'}" onchange="settingsPage.setTextDimColor(this.value)"
                      class="w-8 h-8 rounded cursor-pointer border border-outline-variant bg-transparent p-0"/>
                    <span class="font-mono text-xs text-on-surface-variant">${s.textDimColor || '#adaaaa'}</span>
                  </div>
                </div>
                <div>
                  <p class="text-[10px] text-on-surface-variant font-mono uppercase mb-2">Button Text</p>
                  <div class="flex items-center gap-3">
                    <input type="color" value="${s.buttonTextColor || '#0e5b00'}" onchange="settingsPage.setButtonTextColor(this.value)"
                      class="w-8 h-8 rounded cursor-pointer border border-outline-variant bg-transparent p-0"/>
                    <span class="font-mono text-xs text-on-surface-variant">${s.buttonTextColor || '#0e5b00'}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Right Column -->
          <div class="md:col-span-5 space-y-6">
            <!-- Appearance -->
            <div class="bg-surface-container p-6 border-l-4 border-tertiary">
              <h3 class="font-headline font-bold text-xs tracking-widest text-tertiary uppercase mb-6 flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">font_download</span>Appearance
              </h3>
              <div class="space-y-6">
                <div>
                  <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-2">Font Family</label>
                  <select id="set-font" onchange="settingsPage.save()"
                    class="w-full bg-surface-container-low border-outline-variant text-on-surface font-mono text-sm py-2 px-3 focus:ring-primary/20 focus:border-primary">
                    ${['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Cascadia Code'].map(f =>
                      `<option value="${f}" ${s.fontFamily === f ? 'selected' : ''}>${f}</option>`
                    ).join('')}
                  </select>
                </div>
                <div class="flex gap-4">
                  <div class="flex-1">
                    <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-2">Font Size</label>
                    <div class="flex items-center bg-surface-container-low border border-outline-variant px-3 py-1">
                      <input id="set-fontsize" type="text" value="${s.fontSize}" onchange="settingsPage.save()"
                        class="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-on-surface p-0"/>
                      <span class="text-[10px] text-on-surface-variant font-mono">PX</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-2">Line Height</label>
                    <div class="flex items-center bg-surface-container-low border border-outline-variant px-3 py-1">
                      <input id="set-lineheight" type="text" value="${s.lineHeight}" onchange="settingsPage.save()"
                        class="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-on-surface p-0"/>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-[10px] font-mono text-on-surface-variant uppercase mb-3">Cursor Style</label>
                  <div class="flex flex-wrap gap-2">
                    ${['block', 'bar', 'underline'].map(c => `
                      <button onclick="settingsPage.setCursor('${c}')"
                        class="px-4 py-2 text-xs font-mono transition-colors
                        ${s.cursorStyle === c
                          ? 'bg-surface-container-high border-2 border-primary text-primary'
                          : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:border-on-surface-variant/40'}">${c.toUpperCase()}</button>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Live Preview -->
            <div class="bg-surface-container-lowest border border-primary/20 p-4 font-mono text-[11px] leading-relaxed shadow-lg">
              <div class="flex items-center gap-1.5 mb-2 opacity-50">
                <div class="w-2 h-2 rounded-full bg-error"></div>
                <div class="w-2 h-2 rounded-full bg-secondary"></div>
                <div class="w-2 h-2 rounded-full bg-primary"></div>
              </div>
              <div id="settings-preview" style="font-family:'${s.fontFamily}',monospace; font-size:${s.fontSize}px; line-height:${s.lineHeight};">
                <div class="text-primary-dim">user@architect</div>
                <div class="text-on-surface-variant mb-1">~/system/config/terminal</div>
                <div class="flex items-center">
                  <span class="text-on-surface">$ ls -la | grep "active"</span>
                  <span class="ml-1 w-2 h-4 bg-primary animate-pulse"></span>
                </div>
                <div class="text-on-surface-variant opacity-40 mt-1">drwxr-xr-x  12 admin  staff  384 Oct 12 09:44 .<br/>-rw-r--r--   1 admin  staff  201 Oct 12 09:44 active_profile</div>
              </div>
            </div>

            <!-- Detected Info -->
            <div class="bg-surface-container-low p-6 rounded-sm border border-outline-variant/10">
              <h3 class="font-headline font-bold text-[10px] tracking-widest text-on-surface-variant uppercase mb-4">System Info</h3>
              <div class="space-y-2 font-mono text-[10px]">
                <div class="flex justify-between"><span class="text-on-surface-variant">Detected Shells</span><span class="text-primary">${detectedShells.length}</span></div>
                <div class="flex justify-between"><span class="text-on-surface-variant">Active Shell</span><span class="text-on-surface truncate max-w-[150px]">${s.shell}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.settingsPage = {
    save() {
      const s = getSettings();
      s.fontFamily = document.getElementById('set-font')?.value || s.fontFamily;
      s.fontSize = parseInt(document.getElementById('set-fontsize')?.value) || s.fontSize;
      s.lineHeight = document.getElementById('set-lineheight')?.value || s.lineHeight;
      s.scrollbackLines = parseInt(document.getElementById('set-scrollback')?.value) || s.scrollbackLines;
      saveSettings(s);
      const preview = document.getElementById('settings-preview');
      if (preview) {
        preview.style.fontFamily = `'${s.fontFamily}', monospace`;
        preview.style.fontSize = `${s.fontSize}px`;
        preview.style.lineHeight = s.lineHeight;
      }
    },
    setShell(path) {
      const s = getSettings();
      s.shell = path;
      saveSettings(s);
      render();
    },
    setTheme(theme) {
      const s = getSettings();
      s.theme = theme;
      saveSettings(s);
      if (theme === 'custom') {
        applyCustomColor(s.customColor || '#52fd2e');
      } else {
        document.documentElement.removeAttribute('style');
        document.documentElement.setAttribute('data-theme', theme);
      }
      render();
    },
    setCustomColor(color) {
      const s = getSettings();
      s.theme = 'custom';
      s.customColor = color;
      saveSettings(s);
      applyCustomColor(color);
    },
    setTextColor(color) {
      const s = getSettings();
      s.textColor = color;
      saveSettings(s);
      applyTextColors(s);
      render();
    },
    setTextDimColor(color) {
      const s = getSettings();
      s.textDimColor = color;
      saveSettings(s);
      applyTextColors(s);
      render();
    },
    setButtonTextColor(color) {
      const s = getSettings();
      s.buttonTextColor = color;
      saveSettings(s);
      applyTextColors(s);
      render();
    },
    setCursor(style) {
      const s = getSettings();
      s.cursorStyle = style;
      saveSettings(s);
      render();
    },
    toggleCopy() {
      const s = getSettings();
      s.copyOnSelect = !s.copyOnSelect;
      saveSettings(s);
      render();
    }
  };
})();
