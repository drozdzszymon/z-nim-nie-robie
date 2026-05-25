# Changelog

All notable changes to **Z NIM NIE ROBIĘ** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

🌐 **Other languages:** [🇵🇱 Polski](CHANGELOG.md) · [🇧🇷 Português (BR)](CHANGELOG.pt-BR.md)

---

## [2.0.5] — 2026-05-25 — Production release (Google Play)

First version accepted by Google Play. Available on Android in 3 languages (PL / EN / PT-BR).

### Changed
- Refreshed settings screen design in "Apple/iOS minimal" style: thinner fonts (500/600), bigger paddings, flat buttons without heavy shadows.
- **GUEST** button unified with other toggles (M/F, ADULT/KID, GI/NO-GI) — purple highlight instead of an odd circular marker.
- Subtler player-type pills (ADULT, NO-GI, ♂/♀) without shadows.
- Android `versionCode`: 9 → 10; `autoIncrement` disabled (manual control).

### Fixed
- Outer ScrollView of the settings screen returns to the top on every orientation change (portrait ↔ landscape).

## [2.0.4-beta] — 2026-05-07 — Visiting players from another gym

### Added
- **`GUEST`** toggle on the player card (`○ GUEST` / `✈ GUEST`), purple ✈ icon before the nickname.
- Matchmaker avoids **GUEST–GUEST** pairs with priority higher than gear/weight/skill; broken only when no mathematical alternative exists.
- Guest status is per-session (not stored in the club database).

## [2.0.3-beta] — 2026-04-22 — Resting list during BREAK

### Fixed
- **"WHO'S RESTING"** list visible in both phases (PREP and BREAK) — previously only in PREP.

## [2.0.2-beta] — 2026-04-20 — Keep awake

### Fixed
- Screen no longer turns off during the timer: `useKeepAwake` moved to the root layout + explicit `activateKeepAwakeAsync` call (belt-and-suspenders).

## [2.0.1-beta] — 2026-04-20 — Unified PREP screen

### Changed
- Removed split into separate KID / ADULT / RESTING columns — all pairs in a single dense grid.
- Category color-coding: KID GI (blue), KID NO-GI (cyan), ADULT GI (orange), ADULT NO-GI (red), MIXED (gradient). Legend in the topbar.
- Pair GI rule: counts as GI only when **both** are in GI.
- "RESTING" inline next to the PREP label (instead of a separate column).

### Added
- "Who's out?" modal — two modes per player: **OUT** (permanently) or **REST 1 ROUND** (returns next round).

## [2.0.0-beta] — 2026-04-20 — New modes + matchmaker 2.0

### Added
- **DRILLS** mode — fixed pairs for the whole session, A/B role swap each round.
- **TASK DRILLS** split into **TRIADS** (6-stage rotation) and **DUOS** (A↔B swap).
- **Gender (M / F)** field on the player card.
- **Gender-based fights** — OFF / PRIORITY / ALWAYS.
- **Matchmaking priority** slider — SKILL ↔ WEIGHT (4 snaps).
- **Weight split** — optional split of the mat into two weight groups.
- **Fight order** — SIMILAR / DIFFERENT / RANDOM.
- Language picker at app start (PL / EN / PT).
- **"No-rest (VIP)"** modal with player-name pills.
- End screen **"THANK YOU — GOOD WORK!"**.
- **VERSION V2** panel (contact, GitHub, store).
- Preview of next pairs already during the break.

### Changed
- Optimized triad and duo cards for 10.5" tablets — no scrolling.
- More stable audio focus on Android.

### Fixed
- 10-second warning sound no longer repeats.
- Improved rest rotation in DUOS mode.

## [1.0.0] — 2026-04-18 — First release

First closed version (development, APK distribution). Not on Google Play.

---

[2.0.5]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.5
[2.0.4-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.4-beta
[2.0.3-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.3-beta
[2.0.2-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.2-beta
[2.0.1-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.1-beta
[2.0.0-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.0-beta
[1.0.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v1.0.0
