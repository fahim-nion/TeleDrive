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