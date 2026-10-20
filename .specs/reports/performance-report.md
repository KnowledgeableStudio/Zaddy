# Performance Optimization Report — Zaddy Collection Site

Date: 2025 — Astro 7 static build, measured on Windows / headless Chrome (Lighthouse 13.5, production `astro preview`).

## Headline results

| Metric | Before | After | Change |
|---|---|---|---|
| Lighthouse performance score | 53 | **97** | +44 |
| First Contentful Paint | 2.6 s | **1.4 s** | −46 % |
| Largest Contentful Paint | 3.7 s | **2.5 s** | −32 % |
| Total Blocking Time | 6 020 ms | **0 ms** | −100 % |
| Time to Interactive | 10.0 s | **3.2 s** | −68 % |
| Speed Index | 4.5 s | **2.5 s** | −44 % |
| Cumulative Layout Shift | 0 | 0.001 | ≈ unchanged |
| Initial transfer (home) | 1 659 KiB | **890 KiB** | −46 % |

Raw data: `.specs/reports/lighthouse-before.json`, `.specs/reports/lighthouse-after.json`.

## Media compression (public/)

| Asset | Before | After | Saved |
|---|---|---|---|
| `hero-loop.mp4` | 1 197 992 B | 401 730 B | −66.5 % |
| `hero-poster` (jpg → webp) | 23 233 B | 12 054 B | −48.1 % |
| `story/cold-open.mp4` | 3 277 090 B | 2 247 510 B | −31.4 % |
| `story/cold-open-poster` (jpg → webp) | 57 406 B | 21 826 B | −62.0 % |
| `audio/si-muero.mp3` | 4 878 740 B | 2 527 874 B | −48.2 % |
| **Total** | **9 384 461 B** | **5 210 994 B** | **−44.5 % (−4.17 MB)** |

- Videos re-encoded H.264 CRF 26 (hero) / CRF 28 + light denoise (cold-open); audio kept for compat. Posters converted to WebP. Originals preserved in `.specs/scratchpad/orig/` (gitignored).
- `public/` directory: ~11 MB → ~6 MB.
- `ffmpeg-static` was used for the one-time encode and then **removed from devDependencies** so installs stay fast.
- Product/source imagery already goes through Astro's sharp pipeline → WebP srcsets; unchanged.

## Root causes found & fixes

### 1. Total Blocking Time 6 s — the dominant problem
`matrix-world.js` ran `loadThree()` synchronously at boot: ~730 KB Three.js module eval + scene build + PMREM environment bake on the critical path, plus the first frames' render loop — ~10 s main-thread work under Lighthouse.

**Fix:** rain canvas + CSS ambience paint immediately; Three.js import and scene build moved to `requestIdleCallback(timeout: 1200)` with a `setTimeout` fallback. Relics still fade in during page open — visually identical. File: `src/scripts/matrix-world.js`.

### 2. Per-frame layout/paint animation
Three keyframe animations animated `left`/`top` — layout + paint every frame:
- footer "transmission" sweep → converted to `transform: translateX()`
- contact "connection flow" → `transform: translateY()`
- story chapter light sweep → `transform: translateX()`
- matrix aura drift → already `transform` (verified)

Associated `.motion-paused` pause selectors updated to target the transformed elements. Files: `Footer.astro`, `Contact.astro`, `story.astro`, `MatrixWorld.astro` CSS.

### 3. Pointer-depth effect invalidated whole cards
`motion.js` wrote 8 custom properties on the card root every frame; `--depth-*` vars feed the surface transform but invalidated the entire card subtree (text, images, shadows).

**Fix:** depth vars now written on `[data-depth-surface]` directly (small subtree); light vars stay on the card for `::before` glare. `src/scripts/motion.js`.

### 4. Unthrottled scroll work & resize storms
- `main.js` scroll handler did class toggle + `scrollHeight` read + style write per scroll event → now rAF-throttled.
- `matrix-world.js` window `resize` fired `renderer.setSize` (canvas realloc) per event — mobile URL-bar chrome fires resize on every scroll → now debounced 120 ms, guarded by `disposed`.

### 5. Below-fold render cost
Added `content-visibility: auto` + `contain-intrinsic-size` to below-the-fold blocks (releases, store, contact, footer, story chapters) — skips render work off-screen without layout collapse. Files: `Releases.astro`, `Store.astro`, `Contact.astro`, `Footer.astro`, `story.astro`.

### 6. Head / font / viewport
- `viewport-fit=cover` + safe-area-aware meta (`Base.astro`).
- Font `woff2` preloads (Archivo, Inter, Instrument Serif) + `hero-poster.webp` preload.
- `astro.config.mjs` build/asset tweaks.
- Audio: `preload="none"` kept — 2.5 MB only fetched on first play.

## Music & controls — verified working

Architecture was already sound; verified end-to-end, no changes needed:

- Autoplay attempted on load; correctly stays paused when policy blocks it (tested headless — `paused=true`), `needs-tap` affordance shown.
- First tap anywhere on the page unlocks playback (`pointerdown` unlock) — verified playing + `is-on`.
- Explicit toggle: mute → resume round-trip works (`aria-pressed`, `aria-label` update).
- Single `#bg-music` element persists across Astro client navigation (`transition:persist`) — verified still one element and still playing after navigating to `/story`. No duplicates, no restarts.
- Mute choice persisted in `sessionStorage`; suspended during video modal playback.
- Mobile (390 × 844 emulated): hamburger menu opens, music + motion toggles relocate into `#mobile-experience`, toggle resumes playback — verified with trusted CDP gestures.
- Desktop (1280 px): toggles live in `#nav-experience` — verified.

## Functional smoke test — 20/20 pass

Drove real Chrome via CDP (`Input.dispatchMouseEvent` for trusted gestures). All checks pass, zero console errors/exceptions. Report: `.specs/reports/smoke-test.json`.

Covers: compressed media wired, single audio element, preload=none, autoplay-blocked state, tap-unlock, mute/resume both breakpoints, menu relocation, nav persistence, story cold-open, canvases alive, no JS errors.

`npm test`: 12/12 pass. `npm run build`: 3 pages, clean.

## Remaining issues / honest caveats

- **`three.module.js` 130 KiB "unused JS"** — the matrix relics need it; it's now idle-loaded so it no longer blocks. Flag is Lighthouse counting eval-vs-use, not a runtime cost.
- **Main-thread 905 ms Style & Layout** on first render — a genuinely complex cinematic DOM. Acceptable; further gains would require simplifying markup (rejected — visuals must stay).
- **Headless/software-GPU measurements understate real GPU headroom** — TBT drop is real (JS work moved), but FPS/GPU numbers need a real mid-range phone profile to confirm 60 fps. DevTools emulation used; recommend one manual pass on an actual Android/iPhone.
- Autoplay-with-sound on *first* visit is browser-gated by design — the tap-anywhere unlock + persistent toggle is the correct, policy-compliant behavior, verified working.
- `unused-css` 10 KiB, `font-display` warnings — cosmetic, left as-is.

## Confirmation

Original design, branding, colors, layout, cinematic effects, music, 3D hologram, matrix background, cart/checkout, navigation, and all interactions are **unchanged and functional**. The site is ~46 % lighter on the wire, blocking time eliminated, and every control verified working on desktop and mobile viewports.
