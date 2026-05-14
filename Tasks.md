# Consecration PWA — Granular Build Tasks (AI Agent Execution Plan)

This task plan translates `Plan.md` and `Architecture.md` into a phased, implementation-ready checklist for building the full PWA.

---

## How to Use This Tasks File

- Execute phases in order unless explicitly marked parallelizable.
- Do not skip quality gates at end of each phase.
- Keep commits small and thematic (one subsystem per commit when possible).
- Every user-facing copy string must follow the tone rules: no guilt, no shame, no pressure.
- Prefer progressive enhancement: app must remain usable with JS delays, low bandwidth, and offline constraints.

---

## Phase 0 — Foundation, Tooling, and Repo Scaffolding

### 0.1 Initialize project structure
- [x] Create folder layout:
  - [x] `/src/app`
  - [x] `/src/domain/content`
  - [x] `/src/domain/progress`
  - [x] `/src/domain/modes`
  - [x] `/src/domain/catchup`
  - [x] `/src/domain/reflections`
  - [x] `/src/plugins`
  - [x] `/src/ui/views`
  - [x] `/src/ui/components`
  - [x] `/src/ui/gestures`
  - [x] `/src/infra/storage`
  - [x] `/src/infra/pwa`
  - [x] `/src/infra/notifications`
  - [x] `/src/styles`
  - [x] `/content/packs/montfort/days`
  - [x] `/content/packs/montfort/recurring`
  - [x] `/plugins/pack-montfort-core`
  - [x] `/plugins/enhancement-audio-default`
  - [x] `/scripts`

### 0.2 Configure project tooling
- [x] Add package manager config and lockfile.
- [x] Add TypeScript config (strict mode on).
- [x] Add linting and formatting setup.
- [x] Add scripts for:
  - [x] dev
  - [x] build
  - [x] test
  - [x] content:build
  - [x] content:validate
- [x] Add CI workflow skeleton (build + tests + content validation).

### 0.3 Define shared contracts early
- [x] Create `src/types/` with base types:
  - [x] `UserJourneyState`
  - [x] `DayContent`
  - [x] `Section`
  - [x] `RenderDayPlan`
  - [x] `PluginManifest`
- [x] Add `schemaVersion` constant and migration registry placeholders.

### 0.4 Set quality baseline
- [x] Add initial smoke test ensuring app shell builds.
- [x] Add README contributor instructions for running content build and tests.

**Phase 0 Exit Criteria**
- [x] Repo builds in local dev mode.
- [x] CI skeleton runs without failing configuration steps.
- [x] Shared types compile with no `any` leaks on core contracts.

---

## Phase 1 — App Shell, Routing, and Theme (No-Flicker)

### 1.1 App shell bootstrapping
- [ ] Implement `src/app/bootstrap.ts`:
  - [ ] Load boot-critical settings (`theme`, `lastRoute`) from localStorage.
  - [ ] Load minimal manifest pointer from cache/local bundle.
  - [ ] Hydrate shell and route to resolved entry.

### 1.2 Routing
- [ ] Implement `src/app/router.ts` with routes:
  - [ ] `/today`
  - [ ] `/day/:n`
  - [ ] `/timeline`
  - [ ] `/settings`
  - [ ] `/catch-up`
- [ ] Add route guards for invalid day numbers and unknown consecration IDs.

### 1.3 Theme system and pre-paint init
- [ ] Implement CSS tokens in `src/styles/tokens.css`.
- [ ] Implement light/dark/system mapping in `src/styles/theme.css`.
- [ ] Add inline `theme-init` script in HTML `<head>` to set `data-theme` before render.
- [ ] Add reduce-motion and large-text base classes/toggles.

### 1.4 Core layout
- [ ] Build structural components:
  - [ ] Header
  - [ ] Day pager container
  - [ ] Bottom action area

**Phase 1 Exit Criteria**
- [ ] Reloading does not produce light/dark flicker.
- [ ] Direct navigation to core routes works.
- [ ] Basic shell renders in <1s on repeat local loads (measure and note baseline).

---

## Phase 2 — Content Build Pipeline and Runtime Content Repository

### 2.1 Front matter schema and validation
- [ ] Define schema for markdown metadata:
  - [ ] `title`
  - [ ] `phase`
  - [ ] `author`
  - [ ] `duration`
  - [ ] `audio` (optional)
  - [ ] `sectionType`
  - [ ] tags/keys for summary extraction
- [ ] Implement validator with strict errors and human-readable output.

### 2.2 Markdown compiler
- [ ] Implement `scripts/build-content.ts`:
  - [ ] Parse markdown + front matter.
  - [ ] Resolve recurring prayer references.
  - [ ] Deduplicate recurring content IDs.
  - [ ] Emit:
    - [ ] `dist/content-index.json`
    - [ ] `dist/days/<consecration>/<day>.json`
- [ ] Implement `scripts/validate-content.ts` integrity checks:
  - [ ] Missing day sequence detection.
  - [ ] Invalid/circular include references.
  - [ ] Missing asset links.

### 2.3 Runtime content module
- [ ] Implement `src/domain/content/content-types.ts`.
- [ ] Implement `src/domain/content/content-index.ts` fast lookups.
- [ ] Implement `src/domain/content/content-repository.ts` fetch by `consecrationId + day`.

### 2.4 Seed Montfort content pack
- [ ] Add starter day files and recurring prayers in `/content/packs/montfort`.
- [ ] Ensure at least first-week sample content compiles end-to-end.

**Phase 2 Exit Criteria**
- [ ] Content scripts pass on clean repo.
- [ ] Runtime can render compiled day payload from repository API.
- [ ] Invalid front matter fails fast with actionable message.

---

## Phase 3 — Progress Engine, Persistence, and Journey State

### 3.1 Storage adapters
- [ ] Implement IndexedDB adapter for journey + reflections.
- [ ] Implement localStorage adapter for boot-critical tiny settings.
- [ ] Add storage health checks/fallback handling.

### 3.2 Progress store/service
- [ ] Implement `progress-store.ts` CRUD for `UserJourneyState`.
- [ ] Implement `progress-service.ts`:
  - [ ] Mark day complete/uncomplete.
  - [ ] Compute streak.
  - [ ] Compute completion %.
  - [ ] Compute phase progress markers.
- [ ] Add idempotency protection for repeated completion events.

### 3.3 Migration strategy
- [ ] Add startup migration runner keyed by `schemaVersion`.
- [ ] Add migration test fixtures for at least v1→v2 evolution pattern.

### 3.4 Timeline service skeleton
- [ ] Implement `timeline-service.ts` for completion milestones and reflection entries.

**Phase 3 Exit Criteria**
- [ ] Journey state survives reload/browser restart.
- [ ] Completion and streak logic are deterministic under test.
- [ ] Schema migration path exists and is tested.

---

## Phase 4 — Mode Policy Engine (Guided, Lite, Custom)

### 4.1 Policy interfaces
- [ ] Define `resolveDayPlan(mode, dayContent, missedDays, customRules)` contract.
- [ ] Define completion criteria enum and estimation model.

### 4.2 Guided policy
- [ ] Full-section inclusion logic.
- [ ] Standard pacing metadata.
- [ ] Gentle reminder hooks (no hard pressure copy).

### 4.3 Lite policy
- [ ] Essential-only section filtering.
- [ ] Shortened reading strategy.
- [ ] Enable auto-summary eligibility markers.

### 4.4 Custom policy
- [ ] User inclusion/exclusion rules.
- [ ] Pacing window rules.
- [ ] Validation to avoid impossible criteria.

### 4.5 Policy tests
- [ ] Snapshot tests for same input → same render plan.
- [ ] Edge cases for missing optional sections.

**Phase 4 Exit Criteria**
- [ ] Day render plan is policy-driven, not hard-coded in UI.
- [ ] Mode switch does not mutate source content.
- [ ] Completion criteria differ correctly across modes.

---

## Phase 5 — Catch-up Engine and Missed-Day Summaries

### 5.1 Catch-up decision engine
- [ ] Implement missed-day calculator.
- [ ] Encode rule set:
  - [ ] 0 missed: show current day
  - [ ] +1: normal resume
  - [ ] +2–3: catch-up options screen
  - [ ] 4+: suggest temporary Lite mode
- [ ] Output structured decisions for UI.

### 5.2 Summary generator
- [ ] Implement metadata-driven summary generation using tagged key points.
- [ ] Cap summary length for readability.
- [ ] Ensure neutral, compassionate tone.

### 5.3 Catch-up UI flow
- [ ] Build `/catch-up` view with option cards:
  - [ ] Catch up in one session
  - [ ] Summarize missed days
  - [ ] Switch temporarily to Lite
- [ ] Persist selected path and route accordingly.

**Phase 5 Exit Criteria**
- [ ] Missed-day branching matches plan rules exactly.
- [ ] Summaries can be generated offline from compiled artifacts.
- [ ] No warning/penalty language in copy.

---

## Phase 6 — Day Rendering, Interactions, and Accessibility

### 6.1 Day view composition
- [ ] Implement `day-view.ts` from `RenderDayPlan + DayContent`.
- [ ] Section component supports collapse/expand.
- [ ] Estimated time and phase metadata display.

### 6.2 Gestures and completion interaction
- [ ] Implement swipe day navigation.
- [ ] Implement long-press complete with clear affordance and undo.
- [ ] Prevent accidental completion on short tap.

### 6.3 Accessibility hardening
- [ ] Semantic heading hierarchy.
- [ ] Keyboard support for all actions.
- [ ] ARIA states for accordions and toggles.
- [ ] Focus-visible styles and skip links.

### 6.4 Motion/visual refinement
- [ ] Subtle scroll/reveal animations.
- [ ] Ensure `prefers-reduced-motion` disables non-essential animation.

**Phase 6 Exit Criteria**
- [ ] Daily loop is frictionless: open → read/listen → optional reflect → complete.
- [ ] Major interactions work with keyboard and touch.
- [ ] Accessibility checks pass automated baseline and manual smoke test.

---

## Phase 7 — Reflections, Timeline, and Settings

### 7.1 Reflection module
- [ ] Implement reflection store/service.
- [ ] Add optional reflection prompt block in day view.
- [ ] Ensure completion does not depend on reflection content.

### 7.2 Timeline view
- [ ] Build timeline entries for completions, phase milestones, reflections.
- [ ] Add filters/toggles (e.g., hide streak metrics if desired).

### 7.3 Settings
- [ ] Theme (light/dark/system).
- [ ] Motion and large text preferences.
- [ ] Mode selection (guided/lite/custom).
- [ ] Reminder time preferences.

**Phase 7 Exit Criteria**
- [ ] Reflections are optional and persisted.
- [ ] Timeline renders coherent journey history.
- [ ] Settings immediately affect behavior and survive reload.

---

## Phase 8 — Plugin Host and Internal Pluginization

### 8.1 Plugin manifest and registry
- [ ] Implement `plugin-types.ts` and JSON schema for manifest validation.
- [ ] Implement plugin registry build step.

### 8.2 Runtime plugin host
- [ ] Implement `plugin-host.ts` with capability whitelist.
- [ ] Implement `capability-router.ts` dispatch:
  - [ ] `content:days`
  - [ ] `content:prayers`
  - [ ] `audio:optional`
  - [ ] optional bible expansion hooks

### 8.3 Internal plugins first
- [ ] Convert Montfort content into `pack-montfort-core` plugin contract.
- [ ] Add optional `enhancement-audio-default` plugin with no hard dependency.

### 8.4 Safety and isolation
- [ ] Restrict plugin access to host APIs only.
- [ ] Block direct DOM/global storage access patterns in plugin interface.

**Phase 8 Exit Criteria**
- [ ] App runs core features via plugin interfaces (not special-cased core paths).
- [ ] Disabling optional enhancement plugin does not break primary experience.

---

## Phase 9 — PWA Offline, Caching, and Installability

### 9.1 Service worker
- [ ] Implement `service-worker.ts`:
  - [ ] Precache shell assets.
  - [ ] Precache current + next 7 day payloads.
  - [ ] Runtime caching for optional assets (audio).
  - [ ] Versioned cache cleanup on deploy.

### 9.2 Web app manifest and install UX
- [ ] Create `manifest.webmanifest` with icons and install metadata.
- [ ] Add install prompt UX (non-intrusive).

### 9.3 Sync/prefetch strategy
- [ ] Queue prefetch of next day after completion.
- [ ] Add optional background sync for richer assets.

### 9.4 Offline QA flows
- [ ] Verify full daily loop offline after initial cache.
- [ ] Verify cache recovery after app update.

**Phase 9 Exit Criteria**
- [ ] App is installable as PWA.
- [ ] Daily reading works offline for current + next 7 days.
- [ ] Cache versioning prevents stale-content lock-in.

---

## Phase 10 — Notifications and Compassionate Copy Enforcement

### 10.1 Reminder infrastructure
- [ ] Implement notification permission flow with graceful denial path.
- [ ] Schedule local reminders per user-selected time.

### 10.2 Copy rules enforcement
- [ ] Add lint/check script for forbidden guilt-pressure phrases in system copy.
- [ ] Add approved copy guidance file and examples.

### 10.3 Reminder UX
- [ ] Add preview/edit reminder message.
- [ ] Ensure reminders are invitational and optional.

**Phase 10 Exit Criteria**
- [ ] Reminders function where supported, degrade gracefully elsewhere.
- [ ] Copy checks enforce tone guardrails in CI.

---

## Phase 11 — Performance, QA, and Release Hardening

### 11.1 Performance budgets
- [ ] Establish budgets:
  - [ ] Shell repeat open target <1s (mid-tier mobile)
  - [ ] Keep JS payload lean; defer non-critical modules
- [ ] Add bundle analysis and regression checks.

### 11.2 Test matrix
- [ ] Unit tests: progress, modes, catch-up, summaries.
- [ ] Integration tests: daily flow, settings persistence, plugin resolution.
- [ ] E2E tests: first open, daily open, offline open, mark complete, catch-up routes.

### 11.3 Accessibility and UX QA
- [ ] Automated accessibility checks.
- [ ] Manual checks for keyboard, screen reader labels, reduced motion.

### 11.4 Failure-mode testing
- [ ] Corrupt local state recovery.
- [ ] Missing content payload handling.
- [ ] Plugin incompatibility fallback behavior.

**Phase 11 Exit Criteria**
- [ ] No critical path regressions.
- [ ] Performance and accessibility budgets met.
- [ ] Release candidate checklist complete.

---

## Phase 12 — Expansion Packs and Stretch Goals

### 12.1 St. Joseph content pack (optional expansion)
- [ ] Add new content pack plugin with full day graph and recurring items.
- [ ] Verify no core code changes required beyond plugin registration.

### 12.2 Media and enhancements
- [ ] Add multiple narration voices.
- [ ] Optional screen-off playback and lock-screen controls.

### 12.3 Journey celebration features
- [ ] Milestone badges (optional, non-pressuring).
- [ ] Shareable completion cards/banners.
- [ ] Certificate PDF generation.

### 12.4 Advanced journey tools
- [ ] Timeline enhancements with feast-day reflections.
- [ ] Rule-of-life mode extensions.
- [ ] Missed-day summarization improvements.

**Phase 12 Exit Criteria**
- [ ] New packs and enhancements remain plugin-driven.
- [ ] Stretch features preserve contemplative tone and low-friction core loop.

---

## Cross-Phase Definition of Done (Global)

- [ ] Core loop works end-to-end: open, see today, read/listen, optional reflect, mark complete.
- [ ] Guided/Lite/Custom are policy-driven and tested.
- [ ] Catch-up logic aligns with planned compassionate branching.
- [ ] Offline-first behavior reliable for routine use.
- [ ] Theme system prevents flicker and respects system preference.
- [ ] Plugin architecture supports future consecrations without core rewrites.
- [ ] Tone and accessibility requirements are continuously enforced.

---

## Suggested Execution Cadence for AI Agents

- Milestone A: Phases 0–2 (project skeleton + content pipeline).
- Milestone B: Phases 3–6 (journey logic + daily UX).
- Milestone C: Phases 7–9 (reflections, plugins, offline/PWA).
- Milestone D: Phases 10–12 (notifications, hardening, expansions).

For each milestone:
- [ ] Run full test suite.
- [ ] Run content validation.
- [ ] Record known limitations and follow-up tasks.
- [ ] Ship with changelog entry summarizing user-visible impact.
