# TeleDrive — AI Project Memory

## Purpose
This file is the persistent project handoff document for AI coding agents. 
TeleDrive is a Web Application using Telegram as a storage backend.

---

## 1. Current Project Status
**Status:** Project initialization (Web Pivot).
**Current Phase:** Phase 0 — Research & Feasibility.
**Current Objective:** Determine the technical viability of a Telegram User-Client operating within a browser environment.

---

## 2. Current Working File
`memory.md`

---

## 3. Completed Work
### Phase 0
- [x] Workspace inspection (Confirmed empty directory).
- [x] Direction shift: Abandoned Android, initiated Web Application path.

---

## 4. Architecture Decisions (Web)
### ADR-001: Web Pivot
- **Decision:** Build TeleDrive as a Web Application instead of a native Android app.
- **Reason:** Cross-platform availability and simplified deployment via Netlify.
- **Status:** Accepted.

---

## 5. Phase 0 Research Goals
- [ ] Research: Can MTProto run directly in the browser via WebSockets?
- [ ] Research: Evaluate `GramJS` vs `MTProto-JS` vs `TDLib WASM`.
- [ ] Research: Verification of "Saved Messages" access via user-client login.
- [ ] Research: Browser-based file streaming for large media (preserving original bytes).
- [ ] Research: Netlify Function limitations for Telegram session handling.

---

## 6. Known Constraints
- **Real Auth:** Must use real Telegram user authentication (no bots, no dummy login).
- **Original Files:** Original bytes must be preserved (no re-compression).
- **No Proxy:** Large files should not be proxied through serverless functions if possible.
- **Cross-Device:** Same account must see same "Uploaded" files everywhere.

---

## 7. Agent Handoff Protocol
1. Read all `.md` files in the root.
2. Identify current phase and task from `memory.md`.
3. Never skip Phase 0 feasibility testing.
4. Deliver code one file at a time.

## 3. Completed Work
### Phase 0
- [x] Workspace inspection.
- [x] Direction shift: Web Application.
- [x] **Feasibility Proven:** Established MTProto WebSocket connection from browser to Telegram DC 4.

## 4. Architecture Decisions (Web)
### ADR-002: Telegram Client Library
- **Decision:** Use `GramJS` (telegram) as the primary MTProto library.
- **Reason:** It is the most mature TypeScript/JavaScript implementation with browser support via polyfills.
- **Status:** Accepted.

# TeleDrive — AI Project Memory

## 1. Current Project Status
**Status:** Phase 0 Success. Transitioning to React.
**Current Phase:** Phase 1 — Project Foundation.
**Current Objective:** Build the structured React UI and abstract Telegram services.

## 3. Completed Work
### Phase 0 (Feasibility)
- [x] Established MTProto WebSocket connection in browser.
- [x] Verified real user login (Phone -> OTP).
- [x] Verified original file upload to Saved Messages.
- [x] Verified metadata retrieval from Cloud.

## 4. Architecture Decisions (Web)
### ADR-003: Frontend Framework
- **Decision:** Use React 18.
- **Reason:** Component-based architecture is ideal for complex gallery states and upload queues.
- **Status:** Accepted.

## 1. Current Project Status
**Status:** Phase 2 Auth Successful. Implementing local gallery.
**Current Phase:** Phase 3 — My Gallery.
**Current Objective:** Implement local file selection and media grid with previews.

## 3. Completed Work
### Phase 2 (Authentication)
- [x] Implemented React-based login flow.
- [x] Implemented Session Persistence using `localStorage`.
- [x] Abstracted `telegramService` for global use.

# TeleDrive — AI Project Memory

## 1. Current Project Status
**Status:** UX/UI Finalized. PWA & Deployment Ready.
**Current Phase:** Phase 10 — Release Preparation.
**Current Objective:** Finalize installation manifest and Netlify configuration.

## 3. Completed Work
### Phase 9 (UX Polish)
- [x] Restored High-Density Glassy Grid (3-4 items on mobile).
- [x] Fixed Sync Node functionality and Dark Mode contrast.
- [x] Implemented Media Viewer with Zoom, Panning, and Keyboard nav.
- [x] Implemented Animated Welcome and Logout flows.
- [x] Created Developer Identity Card for Fahim Morshed.
- [x] Increased upload limit to 300 files.

## 4. Architecture Decisions
### ADR-004: Deployment Strategy
- **Decision:** Target Netlify for hosting using `netlify.toml` for SPA routing.
- **Decision:** Implement PWA for home-screen installation capability.


---

## 1. Current Project Status
**Status:** Robust Frontend Overhaul Complete. Production & GitHub Ready.
**Current Phase:** Phase 11 — Frontend & UX Overhaul + Storage Metrics Engine.
**Current Objective:** Comprehensive user satisfaction polish, storage metrics accuracy, and GitHub readiness.

## 3. Completed Work
### Phase 11 (Frontend & Storage Engine Overhaul)
- [x] **Accurate Multi-Category Storage Metrics:** Fixed 500-message cap, misclassification of documents as photos, and 0MB flash. Implemented 5-tier categorization (Photos, Videos, Documents, Audio, Archives/Others) with live counts, formatted sizes, percentages, and segmented progress bar.
- [x] **Instant Synchronous Cache + Deep Background Scanner:** Cached metrics and files in `localStorage` and IndexedDB for 0ms initial load, paired with an incremental background scanner.
- [x] **Optimistic Real-Time Metric Updates:** Uploads and deletions immediately update storage metrics and file lists with zero reload delay.
- [x] **Universal File Support & Dropzone:** Implemented drag-and-drop file upload for all file formats (photos, videos, PDFs, office docs, audio, archives) with upload speed (MB/s) and ETA countdown.
- [x] **Cloud Stream Enhancements:** Added real-time filename search, category filter pills (`All`, `Photos`, `Videos`, `Documents`, `Audio`, `Archives`), sort selector (Newest, Oldest, Largest, Smallest, Name A-Z), and Grid vs List view toggle.
- [x] **Multi-Select & Batch Actions:** Added select mode allowing batch downloading and batch deletion from Telegram Cloud with clean confirmation modals.
- [x] **Two-Step Verification (2FA):** Added Telegram 2FA cloud password support in authentication flow.
- [x] **Universal Media Viewer:** Added keyboard navigation (`ArrowLeft`, `ArrowRight`, `Esc`), metadata drawer (ℹ️), custom audio player, document cards, and real-time download progress bar.
- [x] **Bundle Optimization:** Dynamically imported `heic2any`, reducing main bundle size by ~1.35 MB.
- [x] **GitHub & Release Ready:** Added `.env.example` and full documentation `README.md`.

### Phase 12 (Mobile Responsiveness & Photo Selection Download Engine)
- [x] **Mobile Responsiveness Overhaul:**
  - Implemented 3-column high-density layout on mobile devices (`repeat(3, 1fr)` with 6px gap), matching native iOS Photos and Google Photos.
  - Scaled hero storage metric values (`hero-val` 32px on mobile) and converted the 4 category cards to a clean 2x2 grid.
  - Refactored header and navigation for narrow screens (compact user avatar button, safe padding).
  - Ensured floating action bar fits smoothly within mobile viewports with zero horizontal overflow.
- [x] **Photo Selection & Batch Download System:**
  - Added dedicated "SELECT PHOTOS" button that immediately filters to photos and enters selection mode.
  - Added visible, touch-accessible selection checkboxes on all cards.
  - Integrated `jszip` for batch downloading multiple photos or files into a single, clean ZIP package (`TeleDrive_Photos_X_items.zip`).
  - Added full live download progress modal with percentage and file progress during multi-file downloads.

### Phase 13 (Large Image Thumbnail Engine & Telegram 10MB Limit Bypass)
- [x] **Telegram >9.99MB Limit Root Cause Identified:** Telegram servers do not automatically generate server-side `doc.thumbs` for documents/uncompressed files over 10 MB.
- [x] **Client-Side Upload Thumbnails:** Updated `uploadToTelegram` to automatically render downscaled canvas JPEG thumbnails (320px) and pass `thumb: thumbBuffer` directly to `client.sendFile()`. Telegram permanently stores this client-uploaded thumbnail on the document metadata regardless of file size (even for 50MB+ or 500MB+ files).
- [x] **Dynamic Fallback for Existing Large Images:**
  - Implemented `generateFallbackThumbnailForLargeImage` in `cloud.ts` with a dedicated concurrency-limited queue (`MAX_LARGE_CONCURRENT = 1`).
  - When an image has no server thumbnail (`!doc.thumbs`), the engine downloads the file in the background, renders a high-quality 320px thumbnail via canvas, and permanently saves it to IndexedDB (`cacheService`).
  - Future visits load this thumbnail in **0 ms** directly from local disk cache.
  - Added HEIC image transcoding fallback support.
- [x] **UI Polish:** Added `HD` badge and pulse state on `CloudItem` while background thumbnail generation is underway.
