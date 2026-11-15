# 🚀 TeleDrive — Unlimited Decentralized Cloud Storage

> Turn your Telegram into an infinite, private, high-speed cloud drive directly in your browser.

![TeleDrive Banner](https://raw.githubusercontent.com/fahim-nion/TeleDrive/main/public/manifest.webmanifest)

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![MTProto](https://img.shields.io/badge/Telegram-MTProto%20WSS-26A5E4?style=flat&logo=telegram)](https://core.telegram.org/mtproto)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Overview

**TeleDrive** is a modern, responsive web application that turns Telegram's powerful **Saved Messages** infrastructure into your personal, unlimited cloud storage drive. 

Unlike traditional cloud providers with strict 15 GB quotas and costly monthly subscriptions, TeleDrive provides **unlimited lifetime storage** with up to **2 GB per file** (or 4 GB for Telegram Premium users), completely free.

All file transfers operate **directly between your browser and Telegram's Data Centers** over encrypted WebSockets (MTProto). **No backend servers, no proxies, and no middlemen.**

---

## ✨ Features

### 📊 Precision Storage Metrics Engine
- **Accurate Multi-Category Analytics:** Categorizes your storage into **Photos & Images**, **Videos & Clips**, **Documents & PDFs**, **Audio & Music**, and **Archives & Others**.
- **Real-Time Dynamic Formatting:** Automatically formats bytes into B, KB, MB, GB, and TB.
- **Segmented Visual Bar:** Multi-colored interactive breakdown bar with hover tooltips and storage percentages.
- **Instant 0ms Cache:** Synchronously loads cached metrics on first paint from browser storage, eliminating 0MB loading delays.
- **Deep Background Scanner:** Multi-batch scanner that traverses Telegram message history with pagination.
- **Optimistic Real-Time Updates:** Immediate metrics increment/decrement upon file upload and deletion.
- **Direct Filter Jump:** Click any category card (e.g. *Videos*) to immediately jump into the Cloud Stream filtered by that category.

### 📁 Cloud Stream (Gallery & File Explorer)
- **Universal File Support:** Stream and preview Photos, Videos, Audio, PDFs, Office Documents, Code, and Archives.
- **Live Search:** Instant, real-time search across all file names.
- **Category Filter Pills:** Switch between `All`, `Photos`, `Videos`, `Documents`, `Audio`, and `Archives` in one click.
- **Flexible Sorting:** Sort files by *Newest*, *Oldest*, *Largest Size*, *Smallest Size*, or *Alphabetical (A-Z)*.
- **Dual View Modes:**
  - **High-Density Grid View:** Visual media grid with date grouping, video duration badges, format tags, and hover actions.
  - **List View:** Detailed table view showing thumbnails, file names, category pills, dates, sizes, and direct actions.
- **Multi-Select & Batch Actions:**
  - Select multiple files or click **Select All**.
  - **Batch Download:** Sequential download of selected files directly to your device.
  - **Batch Delete:** Bulk removal from Telegram Cloud with clean confirmation modals.

### ⚡ Upload Hub (Local Gallery)
- **Drag-and-Drop Dropzone:** Intuitive drag & drop interface for selecting files and folders.
- **Live Upload Telemetry:** Real-time speed calculations (e.g. `5.4 MB/s`), ETA countdown, active file counter, and gradient progress bar.
- **Original Bytes Preserved:** Files are uploaded in their original binary format without lossy re-compression.
- **Automatic HEIC Conversion:** Apple iPhone HEIC images are automatically converted for instant local previews.
- **Code-Splitted Performance:** Heavy conversion modules are dynamically imported on-demand, keeping the initial bundle light and fast.

### 🖼️ Full-Featured Media Viewer & Lightbox
- **Images:** High-resolution optimized previews with background raw quality sharpening, zoom slider, and panning.
- **Videos:** Native HTML5 video player with seek bar, play/pause, volume, and fullscreen.
- **Audio:** Embedded player with playback controls and track information.
- **Documents & Archives:** Dedicated document view with format badge, file size, and one-click download.
- **Keyboard Shortcuts:** `ArrowLeft` / `ArrowRight` to navigate, `Escape` to close, `Space` to play/pause.
- **Metadata Drawer (ℹ️):** Inspect file name, exact byte size, MIME type, upload timestamp, and Telegram message ID.
- **Live Download Progress:** Real-time percentage indicator during media fetching.

### 🔐 Security & Two-Factor Authentication (2FA)
- **Direct Client-to-Telegram Encryption:** Your phone number, OTP, and session string stay inside your browser's local storage.
- **2-Step Verification Support:** Full support for Telegram Cloud Passwords (2FA).
- **Session Privacy:** Logging out immediately clears all session keys from the browser.

### 🎨 Design & PWA
- **Dark & Light Mode:** Seamless theme toggle with persistent user preference.
- **Glassmorphic UI:** Modern Apple-inspired glassmorphism with smooth micro-interactions and transitions.
- **Mobile First & PWA Ready:** Responsive high-density layout (3–4 columns on mobile) and PWA manifest for home-screen installation.

---

## 🔒 Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   YOUR WEB BROWSER                       │
│                                                          │
│   ┌───────────────────┐        ┌─────────────────────┐   │
│   │   TeleDrive App   │ ◄────► │ IndexedDB / Storage │   │
│   │   (React + Vite)  │        │ (Session & Cache)   │   │
│   └─────────▲─────────┘        └─────────────────────┘   │
│             │                                            │
│             │ Direct MTProto over Secure WebSockets      │
│             │ (wss://pluto.web.telegram.org/apiws)       │
└─────────────┼────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│              TELEGRAM OFFICIAL DATA CENTERS              │
│               (DC 1, DC 2, DC 3, DC 4, DC 5)             │
│                                                          │
│   • End-to-End User Authentication                       │
│   • Saved Messages Cloud Storage                         │
└──────────────────────────────────────────────────────────┘
```

> **Zero Middleman Servers:** TeleDrive communicates directly with Telegram Data Centers using MTProto over secure WebSockets (`WSS`). There is no intermediate API server, backend database, or tracking proxy.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (version 18 or higher recommended)
- A Telegram account with an active phone number

### 1. Get Telegram API Credentials
1. Visit [https://my.telegram.org](https://my.telegram.org) and log in with your phone number.
2. Navigate to **API development tools**.
3. Create a new application (e.g. name: `TeleDrive Web`).
4. Copy your `api_id` and `api_hash`.

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/fahim-nion/TeleDrive.git
cd TeleDrive
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):

```bash
cp .env.example .env
```

Open `.env` and fill in your Telegram API credentials:

```env
VITE_TELEGRAM_API_ID=your_api_id_here
VITE_TELEGRAM_API_HASH=your_api_hash_here
```

### 4. Run Development Server
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### 5. Production Build
```bash
npm run build
```
The production bundle will be generated in the `dist` directory.

---

## 🚢 Deployment

### Netlify (Recommended)
This repository includes a pre-configured `netlify.toml` for Single Page Application (SPA) routing:

1. Push your repository to GitHub.
2. Link your repository in [Netlify](https://www.netlify.com).
3. Set your Environment Variables in Netlify:
   - `VITE_TELEGRAM_API_ID`
   - `VITE_TELEGRAM_API_HASH`
4. Deploy!

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 18** | Declarative Component-Driven Frontend |
| **TypeScript** | Type Safety & Enterprise Reliability |
| **Vite** | Blazing Fast Bundler & HMR |
| **GramJS (telegram)** | Full-featured MTProto Client for JavaScript |
| **IndexedDB (`idb`)** | Client-Side Disk Caching for Metadata & Thumbnails |
| **heic2any** | Dynamic Client-Side HEIC-to-JPEG Image Transcoding |

---

## 👨‍💻 Author & Dedication

Designed & Engineered with ❤️ by **[Fahim Morshed](https://github.com/fahim-nion)**.

- **GitHub:** [@fahim-nion](https://github.com/fahim-nion)
- **Twitter/X:** [@FahimM0rshed](https://x.com/FahimM0rshed)

> *• THIS PROJECT WAS MADE FOR MY WIFE ❤️ •*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
