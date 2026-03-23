# HostDock

SSH connection & config manager with built-in terminal. Manages `~/.ssh/config` directly.

![Electron](https://img.shields.io/badge/Electron-35-blue) ![Platform](https://img.shields.io/badge/Platform-Win%20%7C%20Mac%20%7C%20Linux-green)

## Features

- **Host Management** — Add, edit, delete, reorder SSH hosts (drag & drop). Supports port forwarding (Local/Remote), ProxyJump, and all common SSH options.
- **SSH Key Management** — Generate (Ed25519/RSA), rename, delete, copy public keys. Renaming a key auto-updates all references in `~/.ssh/config`.
- **Multi-tab Terminal** — Real PTY via node-pty + xterm.js. SSH connections and local shells in tabs. Copy/paste with Ctrl+C/V.
- **Password Storage** — Encrypted with OS keychain (DPAPI on Windows, Keychain on macOS, libsecret on Linux). Auto-fills SSH password prompts.
- **Customization** — 5 color themes + custom RGB picker, text colors, cursor style, font, and more.
- **Cross-platform** — Windows, macOS, Linux.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9
- Build tools for native modules:
  - **Windows**: `npm install -g windows-build-tools` or Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `sudo apt install build-essential python3`

## Install & Run

```bash
git clone <repo-url> && cd ssh-manager
npm install
npm start
```

For development (no sandbox, useful on WSL):

```bash
npm run dev
```

## Build

Builds use [electron-builder](https://www.electron.build/).

```bash
# Windows (NSIS installer + portable)
npm run build:win

# macOS (DMG + ZIP)
npm run build:mac

# Linux (AppImage + DEB)
npm run build:linux

# All platforms
npm run build:all
```

Output goes to `dist/`.

> **Note**: Native modules (node-pty) are rebuilt for the target Electron version automatically.

## Usage

### Hosts

1. Click **NEW CONNECTION** or the **+ NEW HOST** button.
2. Fill in Host Alias, Hostname, Port, User.
3. Choose auth type: **SSH Key** (browse for key file) or **Password** (stored encrypted).
4. Add port forwards with **+ ADD TUNNEL** (Local `-L` or Remote `-R`).
5. Save — writes directly to `~/.ssh/config`.
6. Click **SSH CONNECT** to open a terminal tab.
7. Drag rows by the ⠿ handle to reorder.

### Keys

1. Use the **GENERATE PAIR** panel to create Ed25519 or RSA 4096 keys.
2. Keys are stored in `~/.ssh/`.
3. Hover a key to **copy** public key, **rename**, or **delete**.
4. Renaming updates all `IdentityFile` references in SSH config.

### Terminal

- SSH sessions open from the Hosts page.
- Click **+** or the shell dropdown on the tab bar to open a local shell.
- **Ctrl+C** copies selected text (sends SIGINT when nothing is selected).
- **Ctrl+V** pastes from clipboard.
- Terminal auto-resizes on window resize and sidebar toggle.

### Settings

- **Shell Default** — Select from auto-detected shells or set a custom path.
- **Behavior** — Scrollback buffer, copy on select.
- **Color Theme** — 5 presets (Matrix, Cyan, Purple, Amber, Red) + custom RGB. Text and button text colors.
- **Appearance** — Font family, size, line height, cursor style (block/bar/underline).

## Project Structure

```
src/
├── main/
│   ├── main.js            # Electron main process, IPC handlers
│   ├── preload.js         # Context bridge API
│   ├── ssh-config.js      # Parse/write ~/.ssh/config
│   ├── ssh-keys.js        # Key generation, rename, delete
│   ├── ssh-terminal.js    # PTY spawn (node-pty)
│   ├── shell-detect.js    # Auto-detect available shells
│   └── credentials.js     # Encrypted password storage
└── renderer/
    ├── index.html          # SPA shell, Tailwind, xterm.js
    ├── components/
    │   └── router.js       # SPA router, modal, toast
    └── pages/
        ├── hosts.js        # Host list, form, drag & drop
        ├── keys.js         # Key management UI
        ├── terminal.js     # Multi-tab terminal
        └── settings.js     # App settings
```

## License

MIT
