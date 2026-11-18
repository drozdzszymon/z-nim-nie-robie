# Changelog for Z NIM NIE ROBIĘ

Notable changes across releases of **Z NIM NIE ROBIĘ**, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

Other languages are available in [Polski](CHANGELOG.md) and [Português (BR)](CHANGELOG.pt-BR.md).

## [2.3.0] (2026-11-18)

Upgrade to Expo SDK 58, React Native 0.88.1, and `expo-audio`, paired with a full editorial pass over interface copy, privacy pages, and repository docs.

### Changed
- Upgraded the runtime stack to Expo SDK 58 (`58.0.23`), Expo Router `58.0.30`, React Native `0.88.1`, React `19.3.1`, AsyncStorage `3.1.1`, Gesture Handler `3.5.0`, Reanimated `4.7.1`, and TypeScript `6.0.3`.
- Replaced deprecated `expo-av` with `expo-audio` (`58.0.12`) configured without `RECORD_AUDIO` microphone permissions while keeping the round bell, double 10-second clapper, and background music ducking intact.
- Refactored round phase transitions to `useEffectEvent` and web color-scheme hydration to `useSyncExternalStore`.
- Cleaned up validation messages, option tooltips, `/privacy` copy, and project documentation across Polish, English, and Brazilian Portuguese.
- Bumped app version to `2.3.0`, `android.versionCode` from `13` to `14`, and `ios.buildNumber` from `2` to `3`.

## [2.2.0] (2026-11-15)

Faster matchmaking solver, permanent athlete deletion in the club database, and layout fixes for narrow phones and web browsers.

### Added
- Permanent player deletion inside the Club Database modal via a trash icon with confirmation.
- Edit cancel button and inline validation message right under the lineup form.
- Browser keyboard shortcuts (`Space` pauses and resumes the clock, `Escape` closes open modals and tooltips, `Enter` submits the athlete form, arrow keys move the priority slider).
- Full Brazilian Portuguese translation on the `/privacy` policy page.
- Automated unit tests covering pair matching, triad rotation, and input sanitizers (`npm test`).

### Changed
- Rebuilt the matchmaking solver with bitmask dynamic programming and pre-indexed pair tables so the exact solver handles groups up to 12 athletes (up from 10) and 46-athlete mats run roughly 13x faster.
- Switched the round countdown to system wall-clock time to prevent drift during long rounds and backgrounded browser tabs.
- Stacked the weight-division view vertically on 360 px phone screens and adjusted modal buttons so labels never clip.
- Scoped FTPS web deploy backups strictly to app-owned files and verified hosting TLS certificates.
- Bumped app version from `2.1.0` to `2.2.0`, `android.versionCode` from `12` to `13`, and `ios.buildNumber` from `1` to `2`.

### Fixed
- Mixed `KID + ADULT` pairs now render in positional pairs and drills modes.
- A single adult training alongside kids in positional triads is always placed into a group instead of dropping off the grid.
- `PREFER` gender matching tracks round-robin completion independently for `KID` and `ADULT`, composes with weight division, and respects `NO REST (VIP)`.
- Promoted `GI` kids retain their `GI` adult pairing preference in later rounds.
- The `DROPOUT?` modal works during weight division and active `WORK` phases, and `RESTS 1 ROUND` brings athletes back across every training mode.
- Drills breaks now show the `BREAK` header and upcoming `WORK` and `ASSIST` roles, while session start honors configured prep time.
- Weight input accepts comma decimals such as `82,5`, enforces the 10 to 300 kg range, and blocks duplicate nicknames when editing.
- Browser tabs no longer throw uncaught `WakeLock` errors when opened in the background and re-acquire screen wake lock upon returning.
- Fixed sound instance leaks across repeated session starts.

## [2.1.0] (2026-05-29)

Completed English and Brazilian Portuguese translations on the live timer screen and separated screenshots per language.

### Fixed
- Translated the last Polish strings on the live timer view, including `BREAK`, `MIXED`, triad rotation prompts, `GROUP SWITCH`, and the `Stage` counter.

### Changed
- Split documentation screenshots into `Screenshots/pl`, `Screenshots/en`, and `Screenshots/pt`.
- Bumped app version from `2.0.5` to `2.1.0` and `android.versionCode` to `11` and `12`.

## [2.0.5] (2026-05-25)

First production release live on Google Play in Polish, English, and Brazilian Portuguese.

### Changed
- Calmed down the settings screen with lighter font weights (500 and 600), wider spacing between panels, and flat time cards without heavy drop shadows.
- Matched the `GUEST` toggle to the category, gender, and gear switches with a purple active highlight.
- Bumped `android.versionCode` from `9` to `10`.

### Fixed
- Rotating between portrait and landscape resets the outer settings scroll container back to the top.

## [2.0.4-beta] (2026-05-07)

### Added
- `GUEST` switch on the athlete form marked with a purple airplane icon before the nickname.
- Matchmaker avoids pairing two guests together at a higher priority than gear, weight, and skill, pairing them only when mathematically unavoidable.
- Guest status resets between sessions and isn't saved to the permanent club database.

## [2.0.3-beta] (2026-04-22)

### Fixed
- Resting athletes stay visible in the top bar during both `PREPARATION` and `BREAK` phases.

## [2.0.2-beta] (2026-04-20)

### Fixed
- Moved `useKeepAwake` to the root layout and added explicit `activateKeepAwakeAsync` calls so wall-mounted tablets stay awake throughout rounds.

## [2.0.1-beta] (2026-04-20)

### Changed
- Combined preparation cards into a single color-coded grid (`KID GI`, `KID NO-GI`, `ADULT GI`, `ADULT NO-GI`, and `MIXED`) with a top-bar legend and inline resting names.
- Pairs count as `GI` only when both athletes wear a gi.

### Added
- Two dropout options per athlete in the mid-session modal (`OUT` for the rest of class or `RESTS 1 ROUND` with automatic return).

## [2.0.0-beta] (2026-04-20)

### Added
- `DRILLS` mode with fixed partners for the entire class and alternating A and B roles each round.
- Positional mode split into `TRIADS` (6-stage rotation) and `PAIRS` (mid-round role swap).
- Gender selector on athlete cards and women's pairing modes (`OFF`, `PREFER`, `ALWAYS`).
- Four-step skill-versus-weight slider, optional two-group weight division, and round fight order selector.
- First-launch language picker, `NO REST (VIP)` pill modal, end-of-training screen, version info dialog, and next-round pair preview during breaks.

### Changed
- Sized triad and pair cards to fit 10.5-inch tablets without scrolling and improved Android audio focus stability.

### Fixed
- Stopped the 10-second warning clapper from firing twice and balanced rest rotation in pair drills.

## [1.0.0] (2026-04-18)

Initial internal APK release prior to Google Play publication.

[2.3.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.3
[2.2.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.2
[2.1.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.1
[2.0.5]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.5
[2.0.4-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.4-beta
[2.0.3-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.3-beta
[2.0.2-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.2-beta
[2.0.1-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.1-beta
[2.0.0-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.0-beta
[1.0.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v1.0.0

