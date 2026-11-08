# Decisions

Each entry: what, why, and how to move away from it if the project grows.

## D1 — Progressive Web App instead of native iOS (2026-11-07)
Why: no Apple Developer account; free-signed native builds expire after 7 days. Notifications,
haptics and Live Activities are not needed. Zero cost, instant updates, trivial install on a
second phone.
Exit path: wrap the same code with Capacitor when an account exists → App Store/TestFlight
build with notifications and haptics. Engine, model and UI are reused unchanged. A full native
rewrite would reuse the engine rules and JSON data format.

## D2 — Device-only storage (IndexedDB) with JSON export (2026-11-07)
Why: no remote monitoring needed; no backend to secure; personal data stays on the device.
Exit path: add a sync layer that pushes/pulls ledger entries and runs to a hosted store
(Supabase, Firebase, or Cloudflare Worker + D1) keyed by a family code. The store layer is
behind repository interfaces in `src/store`, so sync is an additional implementation, not a
rewrite. Export format is versioned (`schemaVersion`) for forward migration.

## D3 — React 18 + TypeScript + Vite (2026-11-07)
Why: mature, well understood, large ecosystem, good tooling for an LLM-assisted codebase.
Bundle size is acceptable for an iPhone 12 mini. Alternatives: Svelte (smaller, less
familiar), Preact (drop-in if bundle size ever matters).
Exit path: engine and store have no React dependency; only `src/ui` would change.

## D4 — Dexie for IndexedDB (2026-11-07)
Why: thin, typed, with versioned schema migrations built in. Alternative: raw IndexedDB
(verbose) or localStorage (size limits, no blobs for photos).

## D5 — No router library (2026-11-07)
Why: five screens, no deep links needed, state-driven navigation is simpler and keeps the
runner from being left via browser back by accident. Revisit if screens multiply.

## D6 — Plain CSS with custom properties (2026-11-07)
Why: a handful of screens with very large, custom controls; a utility framework adds little.
Dark mode via `prefers-color-scheme` and tokens on `:root`.

## D7 — Icons: emoji + Phosphor + photos (2026-11-07)
Why: emoji are free and friendly; Phosphor has ~1500 open-source icons in several weights
with a React package; photos make steps concrete. Phase 0 uses emoji only.

## D8 — Generated tones for audio cues in phase 0 (2026-11-07)
Why: avoids asset licensing and loading; Web Audio oscillators are enough to validate the
cue timing. Replace with short recorded sounds in phase 1 if preferred.

## D9 — Points rules live in the engine, UI only displays (2026-11-07)
Why: anti-cheating rules (earliest-done, daily cap, bonus conditions) must be testable and
consistent regardless of screen. See PLAN.md §5–6.

## D10 — Hosting on GitHub Pages (2026-11-07)
Why: free, HTTPS, the user already has GitHub. The site is public but contains only app code.
Exit path: any static host; nothing in the app depends on GitHub.

## D11 — Name: Rondo (2026-11-08)
Why: a musical form that keeps returning to its theme, like a daily routine. Short, easy to
pronounce, not a generic word, fits the home-screen label. Repo `rondo`, Pages path
`/rondo/`. The display name can change later via the manifest; the repo name should not,
since that changes the URL and forces a reinstall on each phone.

## D12 — Deploy with the `gh-pages` package to a `gh-pages` branch (2026-11-08)
Why: `npm run deploy` publishes only `dist/` from the Mac in one command, with no Actions
workflow to maintain. Dev dependency only; nothing from it ships to the phone.
Exit path: replace the script with an Actions workflow, or any static host (see D10).

## D13 — Tooling dev dependencies (2026-11-08)
`typescript-eslint` and `eslint-plugin-react-hooks` for the ESLint setup the phase 0 spec asks
for; `@vitejs/plugin-react` for Vite; `@types/react` and `@types/react-dom`. TypeScript stays
on 6.x because `typescript-eslint` does not yet accept 7.x. None of these ship to the phone.

## D14 — Pages URL follows the account's custom domain (2026-11-08)
The GitHub account has a custom Pages domain, so the app is served from
`https://float.lefant.net/rondo/` and `floatofmath.github.io/rondo/` redirects there. HTTPS is
enforced for this repo because the service worker and wake lock need it. `base` stays `/rondo/`.
Exit path: moving the domain changes the origin, which means a reinstall and a fresh IndexedDB
on each phone, so export data first.

## D15 — Planning docs stay out of the public repo (2026-11-08)
Why: they contain household details. They are gitignored and kept on the development Mac only.
Exit path: move them to a private repo if they need a backup.
