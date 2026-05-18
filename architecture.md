# Architecture

A zero-dependency, no-build Progressive Web App for guiding users through the 33-day Marian Consecration. Files are served directly from a static host — no transpilation, no bundler, no package manager.

---

## Constraints

- **No build step.** Every file is served as-is. There is no `package.json`, no `node_modules`, no compilation phase.
- **No dependencies.** Nothing is installed or imported from a CDN at boot. The sole external integration (Logos Reftagger) is loaded lazily, on-demand, by its own plugin.
- **ES modules throughout.** All JavaScript uses native `<script type="module">` and `import`/`export`. No IIFE, no globals, no script-concatenation tricks.
- **Modern browser target.** ES2020+ is assumed. No polyfills are shipped.

---

## Directory Structure

```
/
├── index.html                  # App shell — the only HTML file
├── manifest.json               # PWA web app manifest
├── sw.js                       # Service worker (offline + install)
│
├── styles/
│   ├── base.css                # CSS custom properties, reset, typography
│   ├── theme.css               # Day/night colour token overrides
│   ├── animations.css          # Load-in and scroll-reveal keyframes
│   ├── layout.css              # Page skeleton, grid, spacing
│   └── components.css          # Reusable UI elements (cards, buttons, modals)
│
├── js/
│   ├── app.js                  # Entry point — imports and registers all plugins
│   │
│   ├── core/
│   │   ├── plugin.js           # Plugin registry and lifecycle manager
│   │   ├── state.js            # localStorage state manager with subscriptions
│   │   ├── events.js           # Lightweight pub/sub event bus
│   │   └── router.js           # Hash-based client-side router
│   │
│   ├── plugins/
│   │   ├── reader.js           # Main reading view — orchestrates day content
│   │   ├── theme.js            # Day/night toggle (🌞/🌛), persists preference
│   │   ├── audio.js            # Web Audio API narration via SpeechSynthesis
│   │   ├── streaks.js          # Streak counter and optional calendar view
│   │   ├── catchup.js          # Catch-up summaries for missed days
│   │   ├── reminders.js        # Optional push reminders (🔔/🔕)
│   │   ├── install.js          # PWA install prompt (⬇️ button)
│   │   ├── liturgical.js       # Marian feast days and suggested start dates
│   │   └── reftagger.js        # Lazy-loads Logos Reftagger for Bible refs
│   │
│   └── modes/
│       ├── traditional.js      # St. Louis de Montfort — 33 days
│       ├── contemporary.js     # Contemporary Marian Consecration
│       ├── lite.js             # Abbreviated / lighter reading load
│       └── joseph.js           # St. Joseph consecration variant
│
├── prayers/
│   ├── schema.json             # Canonical JSON schema for all prayer files
│   ├── traditional/
│   │   ├── day-01.json … day-33.json
│   ├── contemporary/
│   │   ├── day-01.json … day-33.json
│   ├── lite/
│   │   ├── day-01.json … day-33.json
│   └── joseph/
│       ├── day-01.json … day-33.json
│
├── data/
│   └── liturgical-calendar.json  # Static feast day table (no external API)
│
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── maskable-512.png
```

---

## Boot Sequence

```
index.html
  └─ <script type="module" src="js/app.js">
        └─ import core modules (plugin, state, events, router)
        └─ import and register all plugins
        └─ plugin.init() → each plugin's init(state, events) called in order
        └─ router resolves initial hash → reader renders day view
```

`index.html` is the single app shell. It contains landmark elements (`<header>`, `<main>`, `<nav>`, `<footer>`), a `<div id="root">` for dynamic content, and nothing else. All rendering is done by plugins writing into `#root` or named landmark slots.

---

## Core Modules

### `core/state.js`

A thin wrapper around `localStorage`. All keys are namespaced under `consecration.*`.

**Responsibilities:**
- `get(key)` / `set(key, value)` with automatic JSON serialisation
- `subscribe(key, callback)` — fires callback whenever a key changes
- `reset()` — clears all app-owned keys (used by onboarding reset)

**Persisted keys:**

| Key | Type | Description |
|---|---|---|
| `consecration.mode` | `string` | Active mode id (`traditional`, `contemporary`, `lite`, `joseph`) |
| `consecration.startDate` | `string` (ISO) | Date the user began their consecration |
| `consecration.completedDays` | `string[]` | Array of ISO date strings for completed days |
| `consecration.streak` | `number` | Current consecutive-day streak count |
| `consecration.theme` | `"light" \| "dark"` | Explicit override; absent = follow system |
| `consecration.reminders` | `boolean` | Whether daily reminders are active |
| `consecration.reminderTime` | `string` (HH:MM) | Scheduled reminder time |

---

### `core/events.js`

A minimal publish/subscribe bus. No third-party library.

```js
// API
events.on('day:complete', handler)
events.off('day:complete', handler)
events.emit('day:complete', { day: 7 })
```

Used to decouple plugins from one another. For example, `streaks.js` listens for `day:complete` without knowing anything about the reader plugin.

---

### `core/plugin.js`

The plugin registry. Each plugin module must export:

```js
export const name = 'plugin-name'           // unique string id
export async function init(state, events) { /* setup DOM, listeners */ }
export async function destroy()            { /* cleanup */ }  // optional
```

`plugin.js` calls `init()` on each registered plugin in registration order, passing the shared `state` and `events` singletons.

---

### `core/router.js`

Hash-based router (`window.location.hash`). No server-side routing required, making it compatible with any static host.

**Routes:**

| Hash | View |
|---|---|
| `#/` or empty | Today's reading (reader plugin) |
| `#/day/:n` | Specific day reading |
| `#/calendar` | Streak calendar view |
| `#/settings` | Mode selection, reminder config |
| `#/catchup` | Catch-up summary view |

---

## Plugin Architecture

Every feature of the app is a plugin. Plugins are pure ES modules. They share state and communicate only through the event bus — no plugin imports another plugin directly.

### Plugin Lifecycle

```
app.js registers plugins in order
    │
    ▼
plugin.js calls init(state, events) for each
    │
    ├─ Plugin sets up its DOM fragments (if any)
    ├─ Plugin subscribes to state keys it cares about
    └─ Plugin listens on the event bus
    │
    ▼
User navigates / interacts
    │
    ├─ Router emits route events
    ├─ Plugins update DOM slices they own
    └─ Plugins emit domain events (day:complete, theme:change, etc.)
```

---

## Mode System (`js/modes/`)

Each mode is also a plugin. A mode plugin declares the shape of its consecration — how many days, which prayer JSON files to load for each day, and a human-readable name.

**Mode plugin contract:**

```js
export const name = 'mode:traditional'
export const label = 'Traditional (St. Louis de Montfort)'
export const totalDays = 33

// Returns the fetch path for a given day number (1-indexed)
export function prayerPath(day) {
  return `prayers/traditional/day-${String(day).padStart(2, '0')}.json`
}

export async function init(state, events) { /* register self with mode registry */ }
```

`reader.js` queries the active mode (stored in state) to get the prayer file path for the current day, then fetches and renders that file.

---

## Prayer File Format (`prayers/schema.json`)

Each day's content is a standalone JSON file. The reader plugin fetches the file for the current day on demand — no upfront bulk load.

```json
{
  "day": 1,
  "title": "Day 1 — Knowledge of Self",
  "theme": "Humility and self-knowledge as the foundation",
  "sections": [
    {
      "id": "opening-prayer",
      "type": "prayer",
      "title": "Opening Prayer",
      "text": "...",
      "audioKey": "opening-prayer-day1"
    },
    {
      "id": "scripture-1",
      "type": "scripture",
      "reference": "Luke 1:46-55",
      "text": "...",
      "note": "Reftagger will activate links on this reference automatically."
    },
    {
      "id": "meditation",
      "type": "meditation",
      "title": "Reflection",
      "text": "..."
    }
  ],
  "catchupSummary": "A brief summary used by the catch-up plugin when days are missed."
}
```

**Section types:** `prayer`, `scripture`, `meditation`, `litany`

The `audioKey` field is optional. When present, `audio.js` uses it to look up and speak the corresponding text via the Web Speech API.

---

## Theming (`theme.js` + `styles/theme.css`)

Theme is expressed entirely in CSS custom properties defined on `:root`. Two palettes exist: `[data-theme="light"]` and `[data-theme="dark"]`.

On init, `theme.js`:
1. Reads `state.get('consecration.theme')`
2. If absent, checks `window.matchMedia('(prefers-color-scheme: dark)')`
3. Sets `document.documentElement.dataset.theme` accordingly
4. Renders the 🌞/🌛 toggle button into the header

On toggle, the new preference is saved to state and the `data-theme` attribute is flipped. No page reload.

---

## Animations (`styles/animations.css`)

Two animation contexts:

- **Load-in:** Elements entering the DOM use a `@keyframes` fade-up. Applied via a utility class `anim-enter` that the reader plugin adds to newly rendered sections.
- **Scroll-reveal:** An `IntersectionObserver` in `reader.js` adds `anim-visible` to sections as they scroll into view. No JavaScript animation library — pure CSS transitions triggered by class toggling.
- **Reduced motion:** All animations are wrapped in `@media (prefers-reduced-motion: no-preference)` so users with vestibular disorders see no motion.

---

## Web Audio Narration (`plugins/audio.js`)

Uses the browser's native `SpeechSynthesis` API — no audio files to ship, no external service.

**Features:**
- Play/pause/stop controls rendered alongside each readable section
- Voice selection falls back to the default system voice
- Narration state (playing/paused) tracked locally in the plugin, not in persistent state
- `aria-live="polite"` region announces playback status to screen readers

**Prayer file integration:** sections with an `audioKey` field get a narration button. The plugin reads the `text` field of that section and passes it to `SpeechSynthesisUtterance`.

---

## Streak Tracking (`plugins/streaks.js`)

A day is marked complete when the user taps "Complete Day" in the reader. This emits `day:complete` on the event bus.

`streaks.js` listens for `day:complete` and:
1. Appends today's ISO date to `consecration.completedDays` in state
2. Recomputes the current streak (consecutive days ending today)
3. Updates `consecration.streak` in state
4. Re-renders the streak counter in the header

The counter is displayed as a plain number (e.g. **12 days**) — no fire emoji, no leaderboard, no competitive framing.

**Calendar view** (`#/calendar` route): renders a CSS grid of the current month. Days in `completedDays` are visually marked. Fully keyboard-navigable (`role="grid"`, `role="gridcell"`).

---

## Catch-Up System (`plugins/catchup.js`)

On each app open, the plugin compares today's date against `startDate` + `completedDays`. If the user is behind:

1. The number of missed days is computed
2. The catch-up view (`#/catchup`) is offered (never forced)
3. The view fetches `catchupSummary` from each missed day's prayer JSON and renders them as a condensed list
4. The user can mark all missed days as "caught up" (which adds them to `completedDays` without full completion credit) or dismiss

Summaries are fetched on demand per day file — no special catch-up endpoint needed.

---

## Liturgical Calendar (`plugins/liturgical.js`)

Reads `data/liturgical-calendar.json`, a static table of Marian and principal feast days with their fixed or computus-based dates for a rolling 3-year window.

On the settings screen, the plugin surfaces a list of upcoming feast days with the message: *"Start on [date] to finish on [feast]."* Suggested dates are pre-computed locally — no external API call.

`liturgical-calendar.json` format:

```json
[
  { "feast": "Annunciation", "month": 3, "day": 25 },
  { "feast": "Assumption", "month": 8, "day": 15 },
  { "feast": "Immaculate Conception", "month": 12, "day": 8 }
]
```

---

## Reminders (`plugins/reminders.js`)

Uses the `Notifications` API and the service worker's `showNotification`. Off by default.

**Flow:**
1. User taps 🔕 to enable → browser prompts for notification permission
2. On grant, `consecration.reminders` set to `true`, `consecration.reminderTime` stored
3. The service worker is messaged with the schedule via `navigator.serviceWorker.controller.postMessage`
4. The service worker uses a `setInterval` within its scope (kept alive by a periodic-sync registration where supported, or by the `push` event on supporting browsers)
5. User taps 🔔 to disable → reminders flag cleared, service worker messaged to cancel

The 🔕/🔔 button is rendered in the header by this plugin. State of the button reflects `consecration.reminders`.

---

## PWA & Service Worker (`sw.js`, `manifest.json`)

### `manifest.json`

```json
{
  "name": "Consecration",
  "short_name": "Consecration",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### `sw.js` — Caching Strategy

| Asset type | Strategy |
|---|---|
| App shell (`index.html`, `*.css`, `js/**`) | Cache-first, pre-cached on install |
| Prayer JSON (`prayers/**`) | Network-first, falls back to cache |
| `data/liturgical-calendar.json` | Cache-first, updated in background |
| Icons and manifest | Cache-first, pre-cached on install |

The install prompt (⬇️) is handled by `plugins/install.js`, which listens for the `beforeinstallprompt` event, holds the deferred prompt, and surfaces the button in the UI.

---

## Logos Reftagger (`plugins/reftagger.js`)

Loaded lazily — the Logos script tag is appended to `<head>` only after the reader has rendered the day's content. This avoids blocking the initial paint.

```js
export async function init(state, events) {
  events.on('reader:rendered', () => {
    if (document.getElementById('reftagger-script')) return
    const s = document.createElement('script')
    s.id = 'reftagger-script'
    s.src = 'https://api.reftagger.com/v2/RefTagger.js'
    s.async = true
    document.head.appendChild(s)
  })
}
```

The `reader:rendered` event is emitted by `reader.js` after each day's DOM is fully written. Reftagger scans the DOM and converts plain Bible references into interactive links automatically.

---

## Accessibility

- Semantic HTML throughout: `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`
- All interactive controls have visible focus styles and `aria-label` where the label is icon-only (🌞, 🌛, 🔔, ⬇️)
- Day navigation has `role="navigation"` and descriptive `aria-label`
- Reader sections use `role="article"` and heading hierarchy (`h1` → `h2` → `h3`)
- Audio playback state announced via `aria-live="polite"`
- Calendar grid: `role="grid"` / `role="gridcell"` / `aria-selected`
- Colour contrast meets WCAG AA in both light and dark themes
- All animations respect `prefers-reduced-motion`
- No content conveyed by colour alone

---

## Data Flow Summary

```
User opens app
  │
  ├─ sw.js serves cached shell instantly (offline-capable)
  ├─ app.js boots, state hydrates from localStorage
  ├─ router resolves hash → reader.js activates
  ├─ reader.js reads active mode from state
  ├─ mode plugin returns prayer file path for today
  ├─ reader.js fetch()es prayer JSON (cache or network)
  ├─ reader.js renders sections into #root
  ├─ reader.js emits reader:rendered
  │     ├─ audio.js attaches narration buttons
  │     └─ reftagger.js loads Logos script (lazy)
  │
  └─ User taps "Complete Day"
        ├─ events.emit('day:complete', { day, date })
        ├─ streaks.js updates completedDays + streak in state
        ├─ catchup.js rechecks missed-day status
        └─ reader.js advances to next day
```
