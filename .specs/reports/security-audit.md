# Master Audit Report — zaddy.art (Zaddy Collection Site)

Scope: entire project — source, build output, dependencies, integrations, hosting config, and the live site. Method: static review + dynamic verification in real Chrome via CDP (26 automated checks), live TLS/header probing, `npm audit`, secret scanning. **No destructive testing; no layout/design changes.**

## A. Architecture

| Layer | Reality |
|---|---|
| Framework | Astro 7.3.7, fully static (`output: 'static'`), 3 pages (`/`, `/story`, `/404`) |
| Hosting | GitHub Pages — `Server: GitHub.com`, `CNAME` → zaddy.art, `.nojekyll` |
| Backend / DB / Auth | **None** — no server code, no database, no accounts, no cookies |
| Payments | PayPal JS SDK (client-side checkout, public client ID) |
| Third parties | youtube-nocookie iframes (on-demand only), simple-icons, self-hosted fontsource fonts, Three.js self-bundled |
| State | `localStorage` (cart), `sessionStorage` (music/motion prefs) — no sensitive data |

Most enterprise controls (WAF, IDS/IPS, auth, RBAC, sessions, database security, server logs) are **NOT APPLICABLE** — there is no server-side attack surface. The applicable surface is: supply chain, client-side injection, third-party scripts, hosting headers, and info leaks.

## B. Results by phase

### Phase 1 — Web security

| Control | Status | Evidence / note |
|---|---|---|
| XSS prevention | **PASS** | All DOM writes use `textContent`/`createElement`; `innerHTML` only for clearing or a static SVG constant; no `eval`/`new Function`; `set:html` uses trusted constants; iframe src set via property with validated ID (see fixes) |
| Content Security Policy | **PASS — FIXED** | Was absent. Meta CSP added (Pages can't send headers): `default-src 'self'`, scripts self+PayPal (+`wasm-unsafe-eval`/`data:` for PayPal SDK), frames PayPal+youtube-nocookie, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`. Verified live: zero violations, PayPal buttons render |
| SQLi / CSRF / SSRF / RCE / IDOR / uploads | **N/A** | No server, no endpoints, no file uploads |
| Rate limiting / brute force / bots | **N/A** | No auth or API to attack |
| `target="_blank"` hardening | **PASS** | All 3 sites audited — `rel="noopener noreferrer"` everywhere |
| Outbound URL safety | **PASS** | No `javascript:`/`data:` hrefs; external links are trusted constants |

### Phase 2 — Information leak & data protection

| Control | Status | Evidence |
|---|---|---|
| HTTPS everywhere | **PASS** | `http://` → 301 → `https://` |
| TLS | **PASS** | TLS 1.3 ✔, TLS 1.2 ✔, TLS 1.1 refused |
| HSTS | **PASS (partial)** | `max-age=31556952` served by GitHub Pages; no `includeSubDomains`/`preload` — Pages' fixed value, unchangeable |
| Secrets in repo/bundle | **PASS** | Pattern scan of `src/`, `public/`, `dist/`: only the **public** PayPal client ID (designed to be public). No `.env` files exist; `.gitignore` now guards `.env*` (added) |
| `.git` / sourcemap / debug exposure | **PASS** | `dist/` contains none; Pages doesn't serve `.git` |
| Cookies | **PASS** | Site sets **zero** cookies |
| PII minimization | **PASS** | Only checkout fields → PayPal; no analytics/trackers |
| Sensitive data at rest | **N/A** | No database; cart holds product IDs+qty only |

### Phase 3 — Login / admin / account security
**N/A** — no authentication, accounts, or admin surface exists on this site.

### Phase 4 — Stability & performance
See `performance-report.md` — Lighthouse **53 → 97**, TBT 6s → 0, transfer −46%. Media compressed −44.5%. CDN: GitHub Pages edge (fixed). RUM/APM/monitoring: **NOT PRESENT** (see remaining risks).

### Phase 5 — Recovery
Static hosting = GitHub Pages availability; rollback = `git revert` + redeploy. No database → no backup/PITR requirements. **N/A / adequate for this architecture.**

### Phase 6 — Code & supply-chain security

| Check | Status | Evidence |
|---|---|---|
| Dependency vulnerabilities (`npm audit`) | **PASS** | 0 across all severities |
| Package freshness | **PASS** | astro 7.3.7→7.4.1 & simple-icons 16.34→16.35 available — minor, optional |
| SAST (manual) | **PASS** | All scripts reviewed; no unsafe sinks |
| PayPal SDK integrity (SRI) | **NOT VERIFIED** | PayPal publishes no SRI hashes — trust rests on TLS + domain restriction (CSP limits script hosts) |
| Branch protection / CI security | **NOT VERIFIED** | No repo credentials/insight available |
| Secrets scanning | **PASS** | Clean |

### Phase 7 — Functionality & UX
**26/26 automated checks PASS** (trusted-gesture CDP test): compressed media wired, autoplay policy respected + tap-unlock + mute/resume on desktop & mobile (menu-relocated) controls, single persistent audio across navigation, add-to-cart, checkout drawer, **PayPal SDK + buttons render under CSP**, Enter-key no longer reloads checkout, story cold-open, custom 404 returns real 404 status with branded page, robots.txt + sitemap valid, manifest + favicons present. Accessibility basics verified: skip link, aria labels/pressed, focus traps, 44px targets, aria-live toasts.

### Phase 8 — Monitoring
**NOT VERIFIED / ABSENT** — no uptime, error, or traffic monitoring exists (static site). Recommend free UptimeRobot + GitHub Dependabot alerts.

## C. Issues fixed this session

| # | Fix | File |
|---|---|---|
| 1 | **Added Content-Security-Policy** (was entirely absent) — tuned until zero violations with PayPal/YouTube/WASM working | `src/layouts/Base.astro` |
| 2 | **Checkout form Enter-key reload bug** — no submit handler; Enter mid-checkout reloaded the page and lost progress | `src/scripts/main.js` |
| 3 | **PayPal SDK retry poisoning** — one failed load left `paypalPromise` rejected forever, permanently breaking checkout until reload | `src/scripts/main.js` |
| 4 | **Uncapped cart quantity from tampered localStorage** — a crafted `qty` passed validation; now clamped to `MAX_QTY` | `src/scripts/main.js` |
| 5 | **Unvalidated YouTube ID → iframe src** — `data-video` now regex-validated before URL interpolation | `src/scripts/main.js` |
| 6 | **JSON script-block escape** — `JSON.stringify` can emit `</script>`-breaking sequences; `<` now escaped | `src/components/CartDrawer.astro` |
| 7 | **`.env*` files not git-ignored** — added `.env`, `.env.*` (+`!.env.example`) | `.gitignore` |

## D. Remaining risks (need infra/credentials beyond code scope)

| Risk | Severity | Why / what's needed |
|---|---|---|
| No `X-Frame-Options`/`frame-ancestors` → clickjacking possible | **LOW–MED** | Pages can't set headers; meta CSP can't do frame-ancestors. Fix = host behind Cloudflare/Netlify or any CDN with header control. Impact is low: no authenticated/sensitive UI to hijack |
| No `X-Content-Type-Options`, `Permissions-Policy` | **LOW** | Same header limitation |
| HSTS lacks `includeSubDomains`/`preload` | **LOW** | GitHub's fixed value |
| Client-side order amounts | **LOW** | Inherent to serverless PayPal checkout; order is itemized so the paid amount is visible in the PayPal dashboard before fulfilling |
| No monitoring/uptime/Dependabot | **LOW** | Requires external service signup / repo settings |
| CSP `script-src 'unsafe-inline'` | **LOW** | Required by Astro's inline module snippets; XSS sinks audited clean. Could move to hashes later |
| Repo visibility & branch protection | **NOT VERIFIED** | Can't see GitHub repo settings; confirm repo isn't public-with-secrets and enable Dependabot + branch protection |
| PayPal SDK SRI | **N/A** | PayPal doesn't publish hashes; mitigated by CSP host restriction |
| External platform links | **NOT VERIFIED** | ~12 social/streaming URLs not individually fetched |

## E. Performance (from prior pass, re-verified)
Lighthouse 53 → **97** · TBT 6,020ms → **0** · LCP 3.7s → 2.5s · transfer 1,659KiB → **890KiB** · media −44.5% · CLS 0.001.

## F. Final verification

- ✅ `npm run build` — clean (3 pages)
- ✅ `npm test` — 12/12
- ✅ Browser smoke — **26/26**, zero console errors, zero CSP violations
- ✅ Live site — HTTPS enforced, HSTS, TLS 1.3, branded 404, no exposed secrets
- ⚠️ Not 100% "hack-proof" — no site is; residual items are listed above honestly
- ✅ Original design/layout/visuals **unchanged** — all changes are invisible security/robustness hardening
