# Consecration PWA — Modular Architecture

## 1) Goals and Design Principles

This architecture translates `Plan.md` into an **offline-first, plugin-driven, non-React web app** with a contemplative UX.

### Product goals
- Open quickly and show **today’s content immediately**.
- Support **Guided**, **Lite**, and **Custom** modes without duplicating content.
- Track progress with compassion (no guilt mechanics), including catch-up support.
- Support future consecrations (e.g., St. Joseph) via plugins/content packs.

### Engineering goals
- Modular boundaries between content, domain logic, rendering, and persistence.
- Deterministic build pipeline from Markdown + front matter → optimized runtime JSON/HTML.
- Extensible plugin API with safe capability isolation.
- Progressive enhancement: fully usable offline, optional richer enhancements (audio, calendars).

---

## 2) High-Level System View

```text
┌────────────────────────────────────────────────────────────────────┐
│                           Build Time                              │
│                                                                    │
│  content/*.md + prayers/*.md + plugins/*                           │
│        │                                                           │
│        ▼                                                           │
│  Content Compiler + Plugin Resolver + Front Matter Validator       │
│        │                                                           │
│        ▼                                                           │
│  App Manifest (content index, day graph, assets, metadata)         │
│        │                                                           │
│        ▼                                                           │
│  Dist: static HTML/CSS/JS + pre-rendered day payloads              │
└────────────────────────────────────────────────────────────────────┘
                                 │ deploy
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                           Runtime (PWA)                           │
│                                                                    │
│ UI Shell ── Application Core ── Domain Services ── Storage         │
│   │               │                     │               │           │
│   │               │                     │               ├─ local DB │
│   │               │                     │               └─ settings  │
│   │               │                     ├─ progress engine           │
│   │               │                     ├─ catch-up engine           │
│   │               │                     └─ mode policy engine        │
│   │               └─ plugin host / capability router                │
│   └─ theme + animation + accessibility                              │
│                                                                    │
│ Service Worker: offline cache, stale-while-revalidate, sync hooks  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3) Module Breakdown

## 3.1 App Shell Module
**Responsibility:** bootstraps quickly, resolves theme before paint, routes to current day.

- `bootstrap.ts`
  - Applies persisted theme or system theme **before first paint** (prevents flicker).
  - Hydrates minimal shell and hands off to app core.
- `router.ts`
  - URL model: `/today`, `/day/:n`, `/timeline`, `/settings`, `/catch-up`.
- `layout/`
  - Shared structural components (header, day pager, bottom actions).

**Contracts:**
- Input: user state snapshot + app manifest.
- Output: initial route + render commands.

---

## 3.2 Content Domain Module
**Responsibility:** provides normalized day/prayer/reflection content from compiled artifacts.

- `content-repository.ts`
  - Fetches day payload by `consecrationId + day`.
  - Resolves recurring sections (litanies/hymns) from shared content IDs.
- `content-types.ts`
  - `DayContent`, `Section`, `Prayer`, `AudioRef`, `BibleRef`, `PhaseMeta`.
- `content-index.ts`
  - Fast lookup for titles, phases, duration, and plugin ownership.

**Why modular:** switching to St. Joseph pack should not affect UI logic.

---

## 3.3 Progress & Journey Module
**Responsibility:** single source of truth for journey state and progression.

- `progress-store.ts`
  - Persistent model (IndexedDB/localStorage adapter).
- `progress-service.ts`
  - Mark complete, unmark, compute streak, completion %, phase markers.
- `timeline-service.ts`
  - Builds chronological entries (completed day, reflections, milestones).

**Core model (extended from Plan):**
```ts
interface UserJourneyState {
  consecrationId: string;
  mode: 'guided' | 'lite' | 'custom';
  startDate: string;          // ISO date
  currentDay: number;
  completedDays: number[];
  lastOpened: string;         // ISO datetime
  streak: number;
  reflections: Record<number, string>;
  preferences: {
    reminders?: { enabled: boolean; timeLocal?: string };
    theme: 'light' | 'dark' | 'system';
    reduceMotion: boolean;
    largeText: boolean;
  };
}
```

---

## 3.4 Mode Policy Module (Guided / Lite / Custom)
**Responsibility:** determines what to show and how much to show for a day.

- `mode-policy.ts`
  - `resolveDayPlan(mode, dayContent, missedDays, customRules)`.
- `guided-policy.ts`
  - Full content, standard pacing, gentle reminder hooks.
- `lite-policy.ts`
  - Essential prayers, shortened readings, summary option.
- `custom-policy.ts`
  - User-defined inclusion/exclusion and pacing windows.

**Contract output:**
```ts
interface RenderDayPlan {
  sections: Array<{ id: string; required: boolean; collapsedByDefault: boolean }>;
  estimatedMinutes: number;
  canAutoSummarizeMissedDays: boolean;
  completionCriteria: 'strict' | 'essential-only' | 'custom';
}
```

---

## 3.5 Catch-up Engine Module
**Responsibility:** applies compassionate missed-day logic with suggested next actions.

- `catchup-engine.ts`
  - Calculates `missedDays` from calendar/day index.
  - Returns UI decision:
    - Day +1: resume
    - Day +2–3: offer one-session catch-up or summaries
    - Day 4+: suggest temporary Lite mode
- `summary-generator.ts`
  - Produces concise summaries from day metadata + tagged key points.

**Important rule alignment:** no guilt language; options are invitations, not warnings.

---

## 3.6 Reflection & Journal Module
**Responsibility:** optional reflections, timeline integration, prompts.

- `reflection-store.ts`
- `reflection-service.ts`
- `prompt-provider.ts` (optional feast-day prompts from plugin packs)

**Behavior:**
- Entire module is optional and lazy-loaded.
- Completing a day never depends on writing a reflection.

---

## 3.7 Plugin Platform Module
**Responsibility:** safely extends app with content packs and enhancements.

### Plugin categories
1. **Content packs**: consecration schedules, daily content, recurring prayers.
2. **Enhancements**: audio narration, Bible reference expansion, calendars.
3. **UI mode extensions**: alternate lite logic, journaling packs.

### Plugin manifest (build-time + runtime)
```json
{
  "id": "pack.montfort.core",
  "type": "content-pack",
  "version": "1.0.0",
  "displayName": "St. Louis de Montfort",
  "capabilities": ["content:days", "content:prayers", "audio:optional"],
  "entry": "./index.js",
  "compatibility": { "app": ">=1.0.0" }
}
```

### Runtime plugin host
- `plugin-host.ts`
  - Registers plugins from compiled manifest.
  - Exposes only whitelisted capability APIs.
- `capability-router.ts`
  - Routes calls (`getDayContent`, `getAudio`, `getBibleRef`) to owning plugin.

**Safety model:** no direct DOM/global storage access by plugins; all through host APIs.

---

## 3.8 Rendering & Interaction Module
**Responsibility:** lightweight component rendering (framework-agnostic or small library).

- `day-view.ts`
- `section-accordion.ts` (tap to collapse/expand)
- `gesture-handler.ts` (swipe days, long-press complete)
- `animation-controller.ts` (subtle transitions; respects reduce-motion)

**Accessibility baseline:** semantic headings, focus-visible states, ARIA for accordions.

---

## 3.9 Theme & Visual System Module
**Responsibility:** contemplative palette, light/dark/system, no flicker.

- Design tokens in CSS custom properties.
- `theme-init` inline script in HTML head to set `data-theme` pre-hydration.
- Motion tokens with global reduce-motion switch.

---

## 3.10 Offline & PWA Infrastructure Module
**Responsibility:** reliable daily use with intermittent/no network.

- `service-worker.ts`
  - Precache shell + current consecration days.
  - Runtime cache for optional media (audio).
  - Versioned cache invalidation per build hash.
- `sync.ts`
  - Optional background sync for downloading upcoming days/audio.
- `manifest.webmanifest`
  - Installable experience and app icons.

---

## 3.11 Notification & Reminder Module
**Responsibility:** gentle reminders at user-selected times.

- Permission-aware reminders; graceful fallback if notifications denied.
- Messaging library constrained by “no guilt/shame” copy rules.

---

## 3.12 Build Pipeline Module
**Responsibility:** compile markdown/front matter into validated runtime artifacts.

### Steps
1. Load plugin manifests and validate schema.
2. Parse markdown files and front matter (`title`, `phase`, `author`, `duration`, `audio`, etc.).
3. Resolve recurring prayer includes and deduplicate.
4. Build day graph and phase markers.
5. Emit:
   - `content-index.json`
   - `days/<consecration>/<day>.json`
   - searchable metadata.
6. Run integrity checks (missing days, circular refs, invalid links).

---

## 4) Data Architecture

## 4.1 Content Entities
- `Consecration`
- `Day`
- `Section` (reading/prayer/hymn/litany/reflection)
- `RecurringItem`
- `Phase`
- `Asset` (audio, image)

## 4.2 Storage Choices
- **IndexedDB**: journey state, reflections, cached summaries.
- **Cache API**: offline assets and content payloads.
- **localStorage**: tiny boot-critical values (theme, last route).

## 4.3 Versioning
- `schemaVersion` on journey state.
- Migrations executed on app startup.

---

## 5) Key Runtime Flows

## 5.1 First Open
1. Theme initialized pre-paint.
2. App shell loads cached manifest.
3. If no journey state: start flow defaults to Montfort + Guided.
4. Route to Day 1.

## 5.2 Daily Open
1. Load state and compute missed days.
2. Run catch-up engine.
3. Route to `/today` or `/catch-up`.
4. Render mode policy output.

## 5.3 Mark Complete
1. Long press triggers confirmation affordance.
2. Progress service updates completion + streak.
3. Timeline receives milestone event.
4. Next day prefetch queued.

---

## 6) Suggested Directory Layout

```text
/src
  /app
    bootstrap.ts
    router.ts
  /domain
    /content
    /progress
    /modes
    /catchup
    /reflections
  /plugins
    plugin-host.ts
    capability-router.ts
    plugin-types.ts
  /ui
    /views
    /components
    /gestures
  /infra
    /storage
    /pwa
    /notifications
  /styles
    tokens.css
    theme.css
/content
  /packs
    /montfort
      days/*.md
      recurring/*.md
/plugins
  /pack-montfort-core
  /enhancement-audio-default
/scripts
  build-content.ts
  validate-content.ts
```

---

## 7) Non-Functional Requirements

- **Performance:** <1s shell render on repeat opens (mid-tier mobile).
- **Reliability:** app usable offline for at least current + next 7 days once cached.
- **Accessibility:** supports large text and reduced motion.
- **Maintainability:** new content pack should require no changes outside plugin registration.
- **Tone compliance:** all system copy must pass compassionate-language checks.

---

## 8) Incremental Delivery Plan

### Phase 1 (MVP)
- Guided mode, Montfort content pack, day tracking, offline shell, theme system.

### Phase 2
- Lite mode, catch-up summaries, reflections, reminders.

### Phase 3
- Plugin expansion (St. Joseph pack), audio enhancements, timeline/certificate export.

---

## 9) Risks and Mitigations

- **Risk:** plugin complexity too early.
  - **Mitigation:** start with “internal plugins” following same interfaces.
- **Risk:** markdown inconsistency.
  - **Mitigation:** strict front matter schema + CI validation.
- **Risk:** offline cache bloat due to audio.
  - **Mitigation:** opt-in media downloads with quota-aware eviction.
- **Risk:** perceived pressure from streak UI.
  - **Mitigation:** neutral language and optional hiding of streak metrics.

---

## 10) Definition of Done (Architecture)

- Clear module boundaries and ownership documented.
- Build/runtime interfaces defined for content and plugins.
- Data model includes state versioning and migration strategy.
- Offline, theming, catch-up, and mode logic flows specified.
- Architecture supports future consecrations without core rewrites.
