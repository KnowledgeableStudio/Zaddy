# Zaddy Collection — iZad Casanova Official Site

Cinematic single-page artist site. Astro + Three.js, deployed to GitHub Pages at https://zaddy.art.

## Commands

```sh
npm install    # install deps
npm run dev    # dev server
npm run build  # production build -> dist/
npm run preview
```

## Structure

- `src/pages/` — routes (`index`, `404`)
- `src/components/` — Nav, Hero, Releases, Story, Store, Contact, Footer, CartDrawer, Hologram, Platforms
- `src/scripts/` — cart/PayPal + UI (`main.js`), WebGL hologram (`hologram.js`)
- `src/data/site.js` — single source of truth: products, prices, releases, platforms
- `src/styles/global.css` — design system
- `public/` — static assets (audio, video, model, icons, CNAME)

## Deploy

`npm run build`, then push `dist/` contents to the `KnowledgeableStudio/Zaddy` repo `main` branch (GitHub Pages legacy mode). `public/CNAME` must stay — it binds the custom domain.
