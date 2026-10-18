# Graphite/chrome redesign handoff

## Current implementation

The home, story and 404 pages now share a graphite/chrome treatment with restrained green accents, procedural studio reflections, metallic background sculptures and quieter digital rain. Compact merchandise and music cards preserve their existing content and actions. The cart uses conventional retail styling, readable quantity controls, order totals and checkout fields.

The original hologram remains the foreground figure. Larger decorative rings sit behind its section-wide canvas; copy, caption and interaction targets sit above it. Projection wrappers avoid transforms and competing stacking contexts. Shared motion supports reduced motion, a persistent ambient-pause preference, document visibility and page lifecycle cleanup. The background renderer recreates its procedural reflection environment after WebGL context restoration.

Store artwork uses explicit `minmax(0, 1fr)` grid tracks to prevent intrinsic image dimensions from overflowing compact mobile stages. The checked mobile image measured approximately 105px within its 150px button.

## Preserved behavior and content

- All 40 original public/source assets and `src/data/site.js` match their original bytes, including the original model, music and films.
- Original catalog identities, prices, descriptions, links and all seven story chapters remain preserved.
- All nine Coming Soon items retain their names, descriptions, labels and image viewers. Their prices are absent from rendered cards, and they have no purchase action. The three available masks retain catalog prices and Add to Cart.
- PayPal configuration and payment execution remain preserved. No real payment was made during verification.
- **Notify Me remains the existing toast-only interaction.** It does not collect contact information, create a subscription or send a notification.

## Verification

The production build completed for all three routes, and all 12 rendered-catalog tests passed. Byte-hash comparisons verified the 40 original assets and catalog data. Desktop and mobile checks showed the hologram clearly in front of the enlarged rear rings. Cart verification covered quantity two producing a $400 subtotal, $5 shipping and $405 total, checkout/back transitions and removal. Mobile music layout and the menu at 844×390 landscape were also checked.

The original audio and motion buttons now move into desktop navigation and the mobile menu. Browser checks confirmed both controls retain 44px targets, pause/resume and mute work, and the complete menu fits within the 844×390 landscape viewport. With the menu closed, controls no longer overlay product cards. The final compact mask and Coming Soon layouts were checked at 390×844 without horizontal page overflow.

## Local commands

Run from the repository root with dependencies installed:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
ASTRO_TELEMETRY_DISABLED=1 npm test
ASTRO_TELEMETRY_DISABLED=1 npm run preview -- --host 0.0.0.0
```

Build before testing: `tests/catalog-rendering.test.mjs` reads `dist/index.html`. Use the preview for final desktop/mobile navigation, audio/motion controls, cart, viewer and reduced-motion checks. Exercise checkout validation without approving a payment.
