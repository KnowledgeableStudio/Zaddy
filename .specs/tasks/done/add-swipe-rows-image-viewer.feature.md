---
title: Add swipeable card rows on mobile/tablet and a global image viewer
---

## Initial User Prompt

Optimize the website to save space, especially on mobile devices. Convert each section into a single horizontal row that clients can swipe left or right to browse the content without taking up excessive vertical space. Make the swipe interaction smooth, responsive, and touch-friendly.

Also, add an image viewer feature so that when a client clicks or taps an image, it opens in a larger view/lightbox. Allow users to easily close the viewer and return to the page. Make sure the layout remains clean, professional, and fully responsive across mobile, tablet, and desktop without negatively affecting the existing desktop design.

### Requirements

**Chosen approach — native CSS scroll-snap rows (mobile + tablet only):**

- Below `1024px`, each card grid becomes a horizontal snap row: `display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none`. Collections: Releases, Masks, Tees, Hoodies, Jeans, Contact cards.
- Cards: `flex: 0 0 min(80vw, 20rem); scroll-snap-align: start` — next card peeks ~15% as the swipe affordance (no dots/arrows needed).
- Rows bleed to screen edges: `margin-inline: calc(var(--gutter) * -1); padding-inline: var(--gutter); scroll-padding-inline: var(--gutter)`.
- Each scroller gets `tabindex="0"` + `aria-label` — keyboard arrow-scroll is the gesture alternative (web-interface-guidelines).
- Desktop (`≥1024px`): existing auto-fit grids completely unchanged.
- Tap-vs-swipe disambiguation is native: browsers cancel `click` during scroll gestures, so the viewer trigger never fires mid-swipe.

**Image viewer (lightbox):**

- One global overlay (`ImageViewer.astro`), same pattern as `video-modal`: backdrop, shell with `<img>` + caption, prev/next buttons, close button, `2 / 3` counter, `hidden` by default, `z-index: 140` (above cart drawer 111 and video modal 130).
- Triggers are real `<button>`s wrapping stage/artwork images, carrying `data-viewer-group` + `data-viewer-src` + `data-viewer-index`. Gallery scope = the collection the image belongs to.
- Full-res URLs come from `getImage()` at ~1200px webp per asset at build time — attached to the button as `data-viewer-src` (no JSON blob).
- Interactions: Esc / backdrop / × close; `←`/`→` keys + arrow buttons navigate; horizontal swipe on the image navigates with snap-back threshold (`touch-action: pan-y` keeps vertical pan/pinch native); body scroll locks while open; `overscroll-behavior: contain` on shell.
- Focus: moves to close button on open, returns to trigger on close.
- Reduced motion: disable viewer enter/snap transitions; scroll-snap unaffected.
- Single-image groups hide arrows + counter; next/prev images preload on open.

**Files:** `Store.astro` (viewer triggers + `getImage` map + row CSS on `.product-grid`), `Releases.astro` (same for artwork + `.releases-grid`), `Contact.astro` (`.contact-grid` row only), new `ImageViewer.astro`, `index.astro` (mount viewer), `main.js` (viewer logic block ~90 lines).

## Description

// Will be filled in future stages by business analyst
