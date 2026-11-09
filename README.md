# Aura

Aura is an ultra-fast, modern, desktop music player engineered with **Tauri v2**, **Rust**, **React 19**, and **TypeScript**. Designed with sleek matte glassmorphism, dynamic theming (including pure AMOLED black), a non-blocking studio audio engine, and a tiny footprint (~4.8 MB standalone executable / ~1.6 MB installer).

---

## 📸 Screenshots

### Dark Mode & Explore Feed
![Aura Dark Mode](docs/screenshots/s2.png)

### Light Mode Experience
![Aura Light Mode](docs/screenshots/s1.png)

### Dedicated Player & Controls
![Aura UI & Player Dock](docs/screenshots/s3.png)

### Deep Analytics & Library
![Aura Analytics & Library](docs/screenshots/s4.png)

---

## 🌟 What's New in Recent Updates

### 🎨 Modern Frameless Glassmorphic Interface
- **Frameless Title Bar**: Native OS window title bar is cleanly replaced with an integrated, draggable title bar featuring minimalist window controls (**Minimize**, **Maximize/Restore**, and **Close**).
- **Fullscreen Experience**: Seamless toggle into borderless fullscreen mode with **F11** or via the dedicated header control.
- **Dedicated Bottom Player Dock**: Wide, comfortable seekbar scrubber with exact timestamps (`01:23` / `03:45`), high-res artwork, interactive heart favorite button, media controls, and volume slider.
- **Minimalist Explore View**: Home feed is kept clean and clutter-free, displaying purely ranked trending artists and songs (`01`, `02`, `03`...) without distracting play count numbers.

### 🎧 High-Fidelity Audio Engine & Transitions
- **Non-Blocking Rust Audio Pipeline**: File operations and decoding use `std::io::BufReader` outside mutex locks, completely eliminating UI stutter and audio freezes when switching tracks.
- **Studio Audio Fade-In & Fade-Out**: Smooth volume crossfade transitions when switching tracks, pausing, and resuming playback. Configurable transition speeds in Settings (*Instant*, *Fast 200ms*, *Smooth 350ms*, *Studio 600ms*).
- **Smart Playback Fallback**: Clicking Play or Next without a selected track immediately starts playing your library or resumes your last played song.
- **Robust Next & Previous Logic**: Handles queue orders, shuffle randomization, repeat modes (repeat one, repeat all), and rewinds to 0:00 if clicked after 3 seconds of playtime.

### ⏱️ Customizable Sleep Timer
- Bedtime sleep timer accessible right from the bottom player dock.
- Quick presets (**15 min**, **30 min**, **45 min**, **60 min**) or enter **custom minutes** (e.g. 25m, 90m).
- Live countdown badge in the dock and sidebar.
- Music **smoothly fades out** over 2 seconds before automatically pausing playback when time is up.

### 📊 Dedicated Listening Analytics Tab
- Dedicated analytics dashboard tracking all listening habits:
  - **Total Plays** and **Hours Streamed** across your entire library.
  - **#1 Most Played Track** and **#1 Top Artist**.
  - **Ranked Most Played Songs** with exact play counts, runtime, and percentage.
  - **Ranked Top Artists Breakdown** showing total plays and library tracks count.

### 🎭 Expanded Browse Tabs (Genres, Artists, Albums)
- **Genres & Moods View**: Dedicated tab featuring visual mood cards (*Hip hop, Pop, Rock, Electronic, Jazz, Classical, Metal, Country, House, Blues*). Clicking any genre lets you explore and play matching tracks.
- **Artists View**: Dedicated view of all artists in your library with avatars and track counts.
- **Albums View**: Grid of discovered album covers with instant playback.
- **Liked Songs (My Favorite)**: Persistent favorite tracks system saved in `localStorage`.

### 🌓 Complete Theme Engine & Custom Accent Chooser
- Cleanly housed inside the **Settings** view:
  - **Base Themes**: **Dark Slate**, **Pure AMOLED Black** (`#000000`), and **Alabaster Light**.
  - **7 Independent Accent Colors**: Choose between **Cyan**, **Neon Purple**, **Emerald Green**, **Rose Pink**, **Electric Blue**, **Sunset Orange**, and **Canary Gold**. Changing accent colors modifies only highlights, buttons, and slider fills without altering your selected base backdrop!
  - **No Distracting Glows**: Eliminated all fuzzy neon glow box-shadows in favor of crisp, modern matte surfaces.

### 👤 User Profile System
- Clickable profile card in the sidebar opening a full Profile Modal:
  - Custom display name and bio/status.
  - Avatar color picker with personal initial badge.
  - Overview of total plays, library size, hours listened, and top artist.

### ⚡ Extreme Size Optimization
- Rust release profile configured with Link-Time Optimization (`lto = true`), size optimization (`opt-level = "z"`), single codegen unit (`codegen-units = 1`), panic abort (`panic = "abort"`), and symbol stripping (`strip = true`).
- **Standalone `.exe` size**: **~4.86 MB**
- **Setup installer size**: **~1.63 MB**

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Dynamic CSS Variables, Vanilla Glassmorphism (no heavy UI frameworks)
- **Icons:** Lightweight, crisp inline vector SVGs (zero emojis in UI)

### Backend
- **Core Framework:** Tauri v2
- **Language:** Rust (2021 edition)
- **Audio Decoding & Playback:** `rodio` + `std::io::BufReader`
- **Metadata & Cover Art:** `lofty`
- **Filesystem Traversal:** `walkdir`
- **Native OS Dialogs & Shortcuts:** `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-global-shortcut`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Space`** | Play / Pause |
| **`F11`** | Toggle Fullscreen Mode |
| **`Alt + Shift + Right`** | Next Track |
| **`Alt + Shift + Left`** | Previous Track |
| **`Alt + Shift + Space`** | Play / Pause (Global) |
| **`MediaPlayPause`** | Media key Play / Pause |
| **`MediaNextTrack`** | Media key Next Track |
| **`MediaPreviousTrack`** | Media key Previous Track |

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri Prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites)

### Installation & Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development build (starts Vite frontend + Tauri Rust window with hot reload):
   ```bash
   npm run tauri dev
   ```

3. Build production release executables:
   ```bash
   npm run tauri build
   ```

Generated binaries will be located in:
- Standalone executable: `src-tauri/target/release/aura.exe`
- NSIS Windows Installer: `src-tauri/target/release/bundle/nsis/Aura_0.1.0_x64-setup.exe`
- MSI Package: `src-tauri/target/release/bundle/msi/Aura_0.1.0_x64_en-US.msi`

---

## 📂 Project Structure

```text
Aura/
├── docs/
│   └── screenshots/        # Application screenshots (s1-s4)
├── src/                    # Frontend React code
│   ├── components/
│   │   ├── TitleBar.tsx    # Custom frameless window title bar & controls
│   │   ├── Sidebar.tsx     # Menu, Library navigation, profile & sleep indicator
│   │   ├── MainContent.tsx # Explore hero banner, albums carousel & popular tracks
│   │   ├── PlayerDock.tsx  # Full bottom player bar, wide seekbar & sleep timer
│   │   ├── GenresView.tsx  # Dedicated genres & mood cards view
│   │   ├── ArtistsView.tsx # Dedicated artists directory view
│   │   ├── AlbumsView.tsx  # Dedicated albums directory view
│   │   ├── AnalyticsView.tsx # Listening stats & play count breakdown
│   │   ├── ProfileModal.tsx# User profile editor & personal metrics
│   │   ├── Settings.tsx    # Themes, accents, audio fade duration & folder sync
│   │   ├── Library.tsx     # Full library search, sorting & list/grid view
│   │   └── ContextMenu.tsx # Right-click track options
│   ├── App.tsx             # Root orchestrator & audio engine state manager
│   ├── types.ts            # TypeScript definitions, base palettes & accent colors
│   ├── utils.ts            # Time formatters & in-memory deduplicated art cache
│   └── main.tsx            # Vite DOM renderer
├── src-tauri/              # Backend Rust code
│   ├── src/
│   │   ├── main.rs         # Tauri application setup, IPC handlers & window commands
│   │   ├── audio.rs        # Non-blocking audio playback engine powered by rodio
│   │   ├── scanner.rs      # Metadata & cover art extraction via lofty
│   │   └── tray.rs         # System tray helpers
│   ├── Cargo.toml          # Rust dependencies & binary size release profile
│   └── tauri.conf.json     # Tauri app configuration & window properties
└── package.json            # Node.js dependencies & scripts
```
