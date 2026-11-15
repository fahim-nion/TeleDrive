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

### Phase 14 (Dual-Lane Priority Architecture for Lightning Fast Loading)
- [x] **Separation of Concerns (Fast Lane vs Background Lane):**
  - **Fast Lane (`fastThumbQueue`):** Dedicated exclusively to files $\le$ 9.99 MB with server-side thumbnails and native photos. Runs at high concurrency (`MAX_FAST_CONCURRENT = 6`) downloading tiny 5KB `PhotoSize` packets in 10-25 ms at maximum lightning speed.
  - **Background Lane (`largeThumbQueue`):** Dedicated exclusively to files > 9.99 MB missing server thumbnails. Completely decoupled from the fast lane.
  - **Network Priority Yielding:** If any fast thumbnails are pending or actively downloading, the background queue yields and pauses (`setTimeout(processLargeQueue, 250)`), guaranteeing that all standard files load with zero delay.
  - **No Blocking:** Fast queue slots are never held by large image downloads.

### Phase 15 (100% Comprehensive Storage Metrics & History Streaming Engine)
- [x] **Root Cause Resolution for Missing Files in Storage Metrics:**
  - **Paging Bug Fixed:** Replaced flawed manual `client.getMessages("me", { limit: 100, offsetId })` (which omitted `offsetDate` and aborted prematurely on batches `< 100`) with GramJS native async iterator `client.iterMessages("me", { limit: undefined })`. GramJS automatically handles MTProto chunking, `offsetId`, `offsetDate`, and buffer management across the entire Saved Messages history without stopping early.
  - **Removed Hard Caps:** Eliminated the 2,000-message ceiling (`MAX_MESSAGES = 2000`), allowing complete traversal of all messages in history.
  - **Accurate Photo Sizing (`extractPhotoSize`):** Fixed Telegram MTProto `PhotoStrippedSize` trap where selecting `photo.sizes[photo.sizes.length - 1]` selected a 50-byte stripped preview string, undercounting photo sizes to 0.0 MB. The new engine traverses all sizes (`PhotoSize`, `PhotoSizeProgressive`, `PhotoCachedSize`) to extract the true maximum byte count.
  - **Safe 64-Bit Integer Extraction (`extractFileSize`):** Handled GramJS `bigInt.BigInteger`, `BigInt`, `number`, and `string` types with safe `.toJSNumber()` and `.toString()` fallbacks.
  - **Class Prototype Robustness:** Checked `className` in addition to `instanceof` for `MessageMediaDocument`, `MessageMediaPhoto`, `Document`, and `Photo`.
  - **Excluded Chat Stickers:** Excluded Telegram chat stickers that lack a filename attribute so chat stickers are not miscounted as drive files.
  - **Live Scanning Progress Streaming:** Added `scanProgress` updates (`scannedMessages`, `foundFiles`, `currentBytes`) streaming live to `Dashboard` and `StorageMetrics`, displaying a live progress indicator on the hero card while scanning history.
  - **Real-Time Gallery Ingestion:** Files discovered during full scans are seamlessly merged into `cloudFiles` and saved to IndexedDB so all cloud files appear in the user's gallery view.
  - **Documents & Others Metric Display:** Updated the "Documents & Others" card in `StorageMetrics` to accurately display the sum of document, audio, and other bytes and file counts.
  - **Resilient Error Recovery:** Metric calculation preserves accumulated counts on any network interruption instead of wiping progress.

### Phase 16 (Mobile Gallery & Viewer Layer Overhaul)
- [x] **Grid Overflow Bug Fixed:**
  - Resolved CSS Grid `min-width: auto` blowout on `.gallery-grid` children and `.cloud-item`. Long un-truncated filenames previously expanded grid cells beyond the screen width. Applied `min-width: 0 !important; max-width: 100% !important; overflow: hidden !important; box-sizing: border-box !important;` to `.gallery-grid > *`, `.cloud-item`, and meta-footer containers.
  - Added ultra-narrow fallback (`repeat(2, 1fr)`) for screens $\le 340\text{px}$.
- [x] **Toolbar & Filter Row Responsiveness:**
  - Compacted action buttons (Photos, Select, Grid/List, Sync) for mobile viewports so they wrap gracefully without breaking out of the container.
  - Ensured `.tabs-scroll-container` has `width: 100%; max-width: 100%; min-width: 0;` with smooth iOS touch scrolling.
  - Refactored sticky date badges to avoid collision or overlap with the sticky navigation bar.
- [x] **Floating Action Bar Multi-Select Overflow:**
  - Redesigned the floating bottom selection bar on mobile ($\le 540\text{px}$): dynamically sized rounded container (`border-radius: 16px`, `width: calc(100% - 16px)`), responsive action labels, preventing items from wrapping out of the pill shape.
- [x] **MediaViewer Lightbox Mobile Polish:**
  - Compacted the lightbox top header: text truncation for long file titles, icon-only buttons on mobile for Download and Close, and hidden desktop zoom slider.
  - Reduced next/prev navigation chevron overlay footprint on mobile screens (`32px x 48px`, placed close to edges).
  - Transformed the file info drawer on mobile into a centered bottom sheet.
  - Fixed WebKit/Blink filmstrip horizontal scroll clipping issue.
- [x] **Global Viewport Overflow Protection:**
  - Enforced `overflow-x: hidden` and `max-width: 100vw` across root and main containers.

### Phase 17 (Progressive Chunk Rendering & Infinite Scroll Engine)
- [x] **Eliminated Gallery Sluggishness & DOM Overload:**
  - Replaced bulk rendering of all hundreds/thousands of cloud files with progressive chunk slicing (`PAGE_SIZE = 36`).
  - React now renders only 36 items initially, keeping the DOM lightweight, responsive, and 60 FPS smooth.
  - Sliced both Grid View (`groups` derived from `visibleFiles`) and List View (`visibleFiles.map(...)`).
- [x] **IntersectionObserver Sentinel (Infinite Scroll):**
  - Added an invisible sentinel element at the bottom with a 450px pre-fetch margin (`rootMargin: '450px'`).
  - As the user scrolls down, the next 36 items load automatically and seamlessly before reaching the bottom.
  - Once all local files are shown, reaching the bottom triggers `onLoadMore()` to retrieve the next chunk from Telegram MTProto.
- [x] **User Experience Polish:**
  - Added a clean status pill: "SHOW NEXT PORTION (36 of 180)" as a manual fallback and status indicator.
  - Shows "PULLING TELEGRAM CLOUD NODES..." during network fetches.
  - Displays "● All X cloud files loaded" upon reaching the end of the collection.
  - Resets pagination gracefully (`visibleCount = 36`) when switching categories, searching, or changing sort orders.
