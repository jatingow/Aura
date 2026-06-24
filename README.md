# Aura (Vibe Engine)

Aura is a modern, cross-platform music player built with Tauri, Rust, React, and TypeScript. It features a sleek, customizable user interface and a robust Rust-backed audio engine.

## 🚀 Core Features

- **Robust Audio Engine:** Powered by `rodio` in Rust for seamless playback, pause, seeking, and volume control.
- **Smart Library Scanning:** Recursively scans directories for audio files (`mp3`, `flac`, `m4a`, `wav`, `ogg`), extracting embedded metadata (title, artist, album, duration) and album artwork using `lofty`.
- **System Tray Integration:** Run Aura in the background by minimizing it to the system tray, with quick access to show or quit the app.
- **Global Media Shortcuts:** Control playback anywhere using system-wide media keys (Play/Pause, Next, Previous) handled by `@tauri-apps/plugin-global-shortcut`.
- **Dynamic Theming:** Seamless transition between Light and deep slate Dark Mode, driven by CSS variables and React state.
- **Queue Management & Top Artists:** Manage your play queue dynamically, track play counts, and view your top artists and frequently played tracks.
- **Native Explorer Integration:** Easily locate your audio files by revealing them directly in Windows Explorer (or macOS Finder/Linux File Manager) from the app.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Vanilla CSS variables injected dynamically, featuring a beautiful frosted-glass "surface" effect.
- **Icons:** Material symbols / SVG assets (as defined by UI components).

### Backend
- **Core Framework:** Tauri v2
- **Language:** Rust
- **Audio Processing:** `rodio` (for interacting with OS audio drivers)
- **Metadata Parsing:** `lofty` (for reading ID3 tags, parsing durations, and extracting base64 album art)
- **Filesystem & Traversal:** `walkdir` (for deep library scanning)

## 🏗️ Architecture & Implementation Details

### The Frontend (React/Vite)
The React application acts as the UI and state manager. It communicates with the Rust backend via Tauri's IPC (`invoke` API).
- `App.tsx` orchestrates the main state (active tab, dark mode, tracks library, scan path, audio playback state). It manages the "stuck audio pipeline" recovery by syncing playback position with the Rust backend every 250ms.
- Components are modularized under `src/components/`, separating the `Library`, `Sidebar`, `PlayerDock`, and `Settings`.
- Persistence is handled transparently via `localStorage` for user preferences and the music library state (including play counts).

### The Backend (Tauri/Rust)
The Rust backend is responsible for all heavy lifting, ensuring the application remains highly performant and uses minimal system resources.
- **Audio Engine (`audio.rs`):** A custom `AudioState` struct wrapped in `Mutex` maintains the connection to the OS audio drivers via `rodio::Player`. It handles commands like `play_audio`, `pause_audio`, `seek_to`, and `set_volume`. It also includes a graceful recovery mechanism (`refresh_audio_device`) if the audio pipeline stalls.
- **Scanner (`scanner.rs`):** Uses `walkdir` to recursively locate audio files. For each valid file, it uses `lofty::Probe` to extract metadata and track duration. The album art is handled separately in `get_album_art`, which extracts the picture bytes, encodes them in Base64, and formats them for immediate use in React `<img>` tags.
- **System Tray (`main.rs` / `tray.rs`):** Custom tray menus and double-click events allow the window to be hidden or restored efficiently.
- **Native File Explorer:** A custom `show_in_explorer` command triggers OS-specific commands (`explorer /select,`, `open -R`, etc.) to highlight files on the user's local disk.

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation & Running Locally

1. Install Node modules:
   ```bash
   npm install
   ```

2. Start the development server (runs Vite and the Tauri Rust backend):
   ```bash
   npm run tauri dev
   ```

3. Build for production:
   ```bash
   npm run tauri build
   ```

## 📂 Project Structure

```text
Aura/
├── src/                    # Frontend React code
│   ├── components/         # Reusable UI components (Sidebar, Library, etc.)
│   ├── App.tsx             # Main React entrypoint & State Manager
│   ├── types.ts            # TypeScript interfaces & Theme colors
│   └── main.tsx            # Vite DOM renderer
├── src-tauri/              # Backend Rust code
│   ├── src/
│   │   ├── main.rs         # Tauri application setup, IPC routing & tray menu
│   │   ├── audio.rs        # Audio playback engine powered by `rodio`
│   │   ├── scanner.rs      # Metadata and album art extraction using `lofty`
│   │   └── tray.rs         # Tray functionality helpers
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── package.json            # Node.js dependencies and scripts
```
