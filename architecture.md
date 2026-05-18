# Modular Architecture: Consecration PWA

## Overview

A Progressive Web App for guided Catholic consecrations (e.g. St. Louis-Marie de Montfort, St. Joseph). Built with vanilla JS ES modules, no build step required for development. Fully offline-capable, accessibility-first, and extensible via plugins.

---

## Design Principles

1. **No build dependency for runtime** — ES modules load directly in browser; bundling is optional for production.
2. **Plugin-first extensibility** — consecrations, audio packs, and UI modes are plugins, not hardcoded.
3. **Offline-first** — every feature degrades gracefully without network.
4. **Single source of truth** — all mutable state lives in one journal store; no duplication.
5. **Contemplative UX** — no gamification pressure; streaks are informational, not punitive.
6. **Accessibility built-in** — not bolted on. ARIA, keyboard navigation, and motion reduction are first-class.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          index.html                              │
│  (pre-paint theme script, PWA manifest, root mount point)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ boots
┌────────────────────────────▼────────────────────────────────────┐
│                        app/ (Shell Layer)                        │
│  bootstrap · router · shell · settings · manifest · schema      │
└────┬──────────────────┬──────────────────┬───────────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
┌─────────┐    ┌────────────────┐   ┌─────────────────────────────┐
│  ui/    │    │   domain/      │   │   infra/                     │
│ views   │◄──►│ content        │   │ storage · pwa · notify       │
│ comps   │    │ progress       │   └─────────────────────────────┘
│ gestures│    │ modes          │
└─────────┘    │ catchup        │
               │ reflections    │
               └───────┬────────┘
                       │ loads
               ┌───────▼────────┐
               │   plugins/     │
               │ host · router  │
               └───────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  [content-pack]  [audio-pack]  [ui-mode-pack]
```

---

## Module Reference

### `app/` — Shell Layer

The entry layer. Runs once at startup and owns the top-level DOM.

| File | Responsibility |
|------|----------------|
| `bootstrap.ts` | App entry point. Applies saved theme before first paint. Initialises storage, loads plugins, mounts shell. |
| `shell.ts` | Creates and owns the app-shell DOM: header, day pager, route view, bottom actions. |
| `router.ts` | Maps `location.pathname` ↔ typed `AppRoute` objects. Handles history pushState. |
| `settings.ts` | Reads/writes boot-critical preferences from `localStorage` (theme, last route, accessibility flags). |
| `manifest.ts` | Static registry of known consecrations and their plugin IDs. |
| `schema.ts` | `CURRENT_SCHEMA_VERSION` constant and the migration registry consumed by storage on open. |

**Key types:**
```ts
type AppRoute =
  | { name: 'today' }
  | { name: 'day'; day: number }
  | { name: 'timeline' }
  | { name: 'settings' }
  | { name: 'catch-up' };

interface BootSettings {
  theme: 'light' | 'dark' | 'system';
  lastRoute: string;
  reduceMotion: boolean;
  largeText: boolean;
}
```

---

### `domain/` — Business Logic

Pure modules with no DOM access. Depend only on types and `infra/storage`.

#### `domain/content/`

Resolves what a user reads on a given day.

| File | Responsibility |
|------|----------------|
| `repository.ts` | Fetches compiled day JSON from the content cache. |
| `resolver.ts` | Merges shared recurring sections (litanies, hymns) into a `DayContent` object. |
| `index.ts` | Public API: `getDay(consecrationId, day): Promise<DayContent>` |

**Key types:**
```ts
interface DayContent {
  consecrationId: string;
  day: number;           // 1–33
  title: string;
  phase: ContentPhase;
  durationMinutes: number;
  sections: Section[];
}

interface Section {
  id: string;
  type: 'reading' | 'prayer' | 'hymn' | 'litany' | 'reflection' | 'summary';
  title: string;
  html: string;
  required: boolean;
  tags: string[];        // e.g. ['key-point', 'catch-up-safe']
  audio?: AudioRef;
}
```

#### `domain/progress/`

Owns the user's journey state — the only place that writes to the journal store.

| File | Responsibility |
|------|----------------|
| `store.ts` | Thin wrapper around `infra/storage` for `UserJourneyState`. |
| `tracker.ts` | Marks days complete, updates streak, records last-opened timestamp. |
| `index.ts` | Public API: `getJourney()`, `completeDay(n)`, `resetJourney()` |

**Key types:**
```ts
interface UserJourneyState {
  schemaVersion: number;
  consecrationId: string;
  mode: JourneyMode;
  startDate: string;       // ISO date
  currentDay: number;
  completedDays: number[];
  lastOpened: string;      // ISO datetime
  streak: number;
  reflections: Record<number, string>;
  preferences: UserPreferences;
}
```

#### `domain/modes/`

Policy engines that decide what to render. No DOM, no storage writes.

| File | Responsibility |
|------|----------------|
| `guided.ts` | Full content, standard pacing, all sections shown. |
| `lite.ts` | Required sections only; skips optional readings. |
| `custom.ts` | User-defined rules; reads `UserPreferences.customRules`. |
| `index.ts` | `buildRenderPlan(mode, dayContent): RenderDayPlan` |

**Key types:**
```ts
interface RenderDayPlan {
  day: number;
  sections: RenderSection[];  // ordered, filtered by mode policy
  estimatedMinutes: number;
}

interface RenderSection extends Section {
  collapsed: boolean;   // initial UI state
  skippable: boolean;   // user may skip without penalty
}
```

#### `domain/catchup/`

Handles the compassionate path for users returning after missed days.

| File | Responsibility |
|------|----------------|
| `detector.ts` | Computes how many days were missed from `lastOpened`. |
| `planner.ts` | Selects a catch-up strategy based on gap size. |
| `summariser.ts` | Builds a brief summary from `tags: ['catch-up-safe']` sections. |
| `index.ts` | `getCatchUpPlan(journey): CatchUpPlan` |

**Strategies by gap:**

| Gap | Strategy |
|-----|----------|
| 1 day | Resume from current day |
| 2–3 days | Offer: catch up this session or summarise missed days |
| 4+ days | Suggest switching to Lite mode temporarily |

#### `domain/reflections/`

Journal/reflection management. Reflections are stored inside `UserJourneyState.reflections`.

| File | Responsibility |
|------|----------------|
| `store.ts` | Read/write reflections keyed by day number. |
| `index.ts` | `getReflection(day)`, `saveReflection(day, text)` |

---

### `ui/` — Presentation Layer

All DOM manipulation lives here. Receives data from domain modules; never writes to storage directly.

#### `ui/views/`

Full-page route views, mounted by the router.

| View | Route | Purpose |
|------|-------|---------|
| `today-view.ts` | `/today` | Resolves current day, builds render plan, renders sections. |
| `day-view.ts` | `/day/:n` | Same as today but for an arbitrary day (timeline navigation). |
| `timeline-view.ts` | `/timeline` | Visual progress across all 33 days with streak counter. |
| `settings-view.ts` | `/settings` | Theme, accessibility, mode, reminder, and download controls. |
| `catchup-view.ts` | `/catch-up` | Presents catch-up plan options after missed days. |

#### `ui/components/`

Stateless, reusable DOM builders.

| Component | Purpose |
|-----------|---------|
| `section-card.ts` | Renders a single `RenderSection`; handles collapse/expand. |
| `day-pager.ts` | Prev/next day navigation strip with completion status. |
| `streak-badge.ts` | Discrete streak counter (non-gamified display). |
| `calendar.ts` | Optional 33-day calendar with liturgical date suggestions. |
| `install-banner.ts` | PWA install prompt with ⬇️ button. |
| `reminder-toggle.ts` | 🔔/🔕 toggle for notification reminders. |
| `theme-toggle.ts` | 🌛/🌞/⚙ three-state theme switcher. |
| `audio-player.ts` | Play/pause/skip for Web Audio API narration. |

#### `ui/gestures/`

Touch and pointer interaction handlers, attached by views.

| File | Purpose |
|------|---------|
| `swipe.ts` | Horizontal swipe → next/prev day navigation. |
| `scroll-reveal.ts` | Intersection observer for section entrance animations. |

---

### `infra/` — Platform Services

Abstracts browser APIs so domain and UI code stays testable.

#### `infra/storage/`

| File | Purpose |
|------|---------|
| `idb.ts` | IndexedDB adapter: opens DB, runs migrations, typed get/put/delete. |
| `local.ts` | `localStorage` adapter for small key-value boot settings. |
| `migrations.ts` | Ordered array of `Migration` objects; applied on DB open if version is behind. |

**Rule:** only `domain/progress` and `domain/reflections` write to IndexedDB. All other modules read.

#### `infra/pwa/`

| File | Purpose |
|------|---------|
| `register.ts` | Registers the service worker on app load. |
| `sw.ts` | Service worker: precaches shell, caches content on first fetch, serves offline. |
| `cache.ts` | Named cache helpers (`SHELL_CACHE`, `CONTENT_CACHE`). |

#### `infra/notifications/`

| File | Purpose |
|------|---------|
| `scheduler.ts` | Requests permission, schedules daily reminder via `Notification` API. |
| `index.ts` | `enableReminder(timeLocal)`, `disableReminder()` |

---

### `plugins/` — Plugin Platform

Allows consecration content packs, audio packs, and UI mode packs to be added without touching core code.

#### Plugin host (`plugins/host.ts`)

- Reads the plugin manifest (compiled JSON at build time).
- Imports each plugin's entry module.
- Registers capabilities via the capability router.

#### Capability router (`plugins/capability-router.ts`)

Whitelists the APIs a plugin may call. Plugins receive a `PluginContext` object — they cannot touch the DOM or storage directly.

```ts
interface PluginContext {
  // Content packs only
  registerConsecration(manifest: ConsecrationManifest): void;
  registerDay(consecrationId: string, day: number, content: DayContent): void;
  registerRecurring(id: string, section: Section): void;

  // Audio packs only
  registerAudio(sectionId: string, ref: AudioRef): void;

  // UI mode packs only
  registerMode(id: string, policy: ModePolicyFn): void;
}
```

#### Plugin types

| Type | Examples | What it registers |
|------|----------|------------------|
| `content-pack` | `pack-montfort-core`, `pack-st-joseph` | Consecration + all 33 days + recurring prayers |
| `audio-pack` | `audio-montfort-english` | Audio `src` URLs mapped to section IDs |
| `ui-mode` | `mode-family`, `mode-intensive` | Custom `ModePolicyFn` |

#### Plugin manifest format

```json
{
  "id": "pack-montfort-core",
  "type": "content-pack",
  "version": "1.0.0",
  "entry": "./plugins/pack-montfort-core/index.js",
  "capabilities": ["registerConsecration", "registerDay", "registerRecurring"]
}
```

---

### `content/` — Source Content

Human-authored Markdown files, compiled to JSON by `scripts/build-content.ts`.

```
content/
└── packs/
    └── montfort/
        ├── days/
        │   ├── day-01.md   ← front matter: title, phase, duration, audio
        │   └── ...         ← sections delimited by headings
        └── recurring/
            ├── hail-mary.md
            ├── litany-of-loreto.md
            └── ...
```

The build script outputs one JSON file per day into `plugins/pack-montfort-core/dist/`.

---

### `scripts/` — Build & Validation

| Script | Purpose |
|--------|---------|
| `build-content.ts` | Parses Markdown + front matter → `DayContent` JSON. |
| `validate-content.ts` | Checks all 33 days exist, sections are valid, audio refs resolve. |

Run via `npm run content:build` and `npm run content:validate`.

---

### `styles/` — Design System

| File | Purpose |
|------|---------|
| `tokens.css` | CSS custom properties: colour palette, spacing scale, typography, shadows, motion duration. |
| `theme.css` | Component styles referencing tokens. Theme switching via `[data-theme]` on `<html>`. |

**Theme switching:** a tiny inline script in `<head>` reads `localStorage` and sets `data-theme` before the first paint, preventing flash of wrong theme.

**Accessibility tokens:**
- `--motion-duration: 160ms` (set to `0ms` when `prefers-reduced-motion: reduce`)
- `--font-size-base: 1rem` (increased to `1.25rem` in large-text mode)

---

## Data Flow: Rendering a Day

```
bootstrap
  └─► pluginHost.load()          loads content-pack plugin
  └─► router.resolve(url)        → AppRoute { name: 'today' }
  └─► shell.mount()              creates DOM skeleton
        └─► todayView.render()
              └─► progress.getJourney()        → UserJourneyState
              └─► content.getDay(id, day)      → DayContent
              └─► modes.buildRenderPlan(...)   → RenderDayPlan
              └─► sectionCard(section) × N    → DOM nodes
              └─► audioPlayer.attach(sections) (if audio plugin loaded)
```

---

## Data Flow: Completing a Day

```
user taps "Mark complete"
  └─► progress.completeDay(n)
        └─► idb.put(journeyState)    persists
        └─► catchup.detector(...)    resets miss counter
  └─► router.navigate('/today')
  └─► todayView re-renders with next day
```

---

## Storage Layout

| Store | Engine | Contents | Writer |
|-------|--------|----------|--------|
| `journey` | IndexedDB | `UserJourneyState` (one record) | `domain/progress` |
| `reflections` (embedded) | — | Inside `journey.reflections` | `domain/reflections` |
| `content-cache` | Cache API | Compiled day JSON payloads | Service worker |
| `shell-cache` | Cache API | HTML, CSS, JS, fonts | Service worker |
| `boot-settings` | localStorage | Theme, last route, a11y flags | `app/settings` |

---

## PWA & Offline Strategy

1. **Install:** `infra/pwa/register.ts` registers the service worker.
2. **Precache:** on install event, SW caches the app shell (HTML + CSS + core JS).
3. **Content cache:** SW intercepts requests for day JSON and caches on first fetch; serves from cache thereafter.
4. **Fallback:** if network is unavailable and cache is cold, shows an offline placeholder encouraging the user to return when connected.
5. **Update:** SW uses a `skipWaiting` + `clients.claim` strategy so updates apply on next visit without user action.

---

## Liturgical Calendar Integration

`domain/calendar/` (future module):

- Provides suggested start dates for each consecration based on Marian feast days.
- Purely read-only; no storage writes.
- Input: today's date. Output: `SuggestedDate[]` with feast name, start date, and consecration date.

Example output:
```
Start 18 May → Consecrate 19 June (feast of the Sacred Heart)
Start 13 Aug → Consecrate 8 September (Birth of Our Lady)
```

---

## Module Dependency Rules

```
app/        may import:  domain/*, ui/*, infra/*, plugins/host
domain/     may import:  infra/storage, types/
ui/         may import:  domain/*, types/
infra/      may import:  types/
plugins/    may import:  types/ only (via PluginContext interface)
```

**Forbidden:**
- `domain/` must not import `ui/`
- `infra/` must not import `domain/` or `ui/`
- Plugins must not import any internal module directly

---

## Directory Structure

```
consecration/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── app/
│   │   ├── bootstrap.ts
│   │   ├── shell.ts
│   │   ├── router.ts
│   │   ├── settings.ts
│   │   ├── manifest.ts
│   │   └── schema.ts
│   │
│   ├── domain/
│   │   ├── content/
│   │   │   ├── repository.ts
│   │   │   ├── resolver.ts
│   │   │   └── index.ts
│   │   ├── progress/
│   │   │   ├── store.ts
│   │   │   ├── tracker.ts
│   │   │   └── index.ts
│   │   ├── modes/
│   │   │   ├── guided.ts
│   │   │   ├── lite.ts
│   │   │   ├── custom.ts
│   │   │   └── index.ts
│   │   ├── catchup/
│   │   │   ├── detector.ts
│   │   │   ├── planner.ts
│   │   │   ├── summariser.ts
│   │   │   └── index.ts
│   │   └── reflections/
│   │       ├── store.ts
│   │       └── index.ts
│   │
│   ├── ui/
│   │   ├── views/
│   │   │   ├── today-view.ts
│   │   │   ├── day-view.ts
│   │   │   ├── timeline-view.ts
│   │   │   ├── settings-view.ts
│   │   │   └── catchup-view.ts
│   │   ├── components/
│   │   │   ├── section-card.ts
│   │   │   ├── day-pager.ts
│   │   │   ├── streak-badge.ts
│   │   │   ├── calendar.ts
│   │   │   ├── install-banner.ts
│   │   │   ├── reminder-toggle.ts
│   │   │   ├── theme-toggle.ts
│   │   │   └── audio-player.ts
│   │   └── gestures/
│   │       ├── swipe.ts
│   │       └── scroll-reveal.ts
│   │
│   ├── infra/
│   │   ├── storage/
│   │   │   ├── idb.ts
│   │   │   ├── local.ts
│   │   │   └── migrations.ts
│   │   ├── pwa/
│   │   │   ├── register.ts
│   │   │   ├── sw.ts
│   │   │   └── cache.ts
│   │   └── notifications/
│   │       ├── scheduler.ts
│   │       └── index.ts
│   │
│   ├── plugins/
│   │   ├── host.ts
│   │   └── capability-router.ts
│   │
│   ├── types/
│   │   ├── content.ts
│   │   ├── journey.ts
│   │   ├── plugins.ts
│   │   ├── rendering.ts
│   │   └── index.ts
│   │
│   └── styles/
│       ├── tokens.css
│       └── theme.css
│
├── content/
│   └── packs/
│       └── montfort/
│           ├── days/
│           └── recurring/
│
├── plugins/
│   ├── pack-montfort-core/
│   └── audio-montfort-english/
│
├── scripts/
│   ├── build-content.ts
│   └── validate-content.ts
│
└── test/
```

---

## Implementation Phases

| Phase | Scope |
|-------|-------|
| 0 | Types, config, empty script stubs, CI pipeline |
| 1 | App shell: bootstrap, router, shell DOM, settings, theme toggle |
| 2 | Content pipeline: Markdown → JSON, content repository, resolver |
| 3 | Progress persistence: IndexedDB store, migrations, day completion |
| 4 | Mode policy engine: guided/lite render plans, section cards |
| 5 | Catch-up flow: detector, planner, summariser, catch-up view |
| 6 | Day rendering interactions: collapse/expand, swipe gestures, audio player |
| 7 | Reflections and timeline: journal input, 33-day calendar view, streak badge |
| 8 | PWA hardening: service worker, offline fallback, install banner |
| 9 | Notifications and liturgical calendar: reminder toggle, suggested dates |
| 10 | Additional plugins: second consecration pack, audio narration pack |
