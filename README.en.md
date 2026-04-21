# 🥋 Z NIM NIE ROBIĘ

<p align="center">
  <img src="Images/LOGO_PL.png" alt="Z NIM NIE ROBIĘ — logo" width="260" />
</p>

<p align="center">
  <b>Smart training app for running BJJ sparring, task drills and technique drills.</b><br/>
  Automatic pair matchmaking · Big timers · Triad rotation · Readable from across the mat
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.2%20Beta-orange" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/framework-Expo%20%2B%20React%20Native-blueviolet" alt="Framework" />
  <img src="https://img.shields.io/badge/language-TypeScript-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/i18n-PL%20%7C%20EN%20%7C%20PT-orange" alt="Languages" />
</p>

<p align="center">
  <a href="https://znimnierobie.pl"><b>▶ Try the web version</b></a>
</p>

<p align="center">
  <a href="README.md">🇵🇱 Polski</a> · <b>🇬🇧 English</b> · <a href="README.pt-BR.md">🇧🇷 Português (BR)</a>
</p>

---

## Table of contents

- [What's new in v2.0.2 Beta](#whats-new-in-v202-beta)
- [About the app](#about-the-app)
- [Screenshots](#screenshots)
- [Training modes](#training-modes)
- [Matchmaking engine](#matchmaking-engine)
- [Main features](#main-features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running the app](#running-the-app)
- [Web version](#web-version)
- [Privacy](#privacy)
- [License](#license)

---

## What's new in v2.0.2 Beta

### 🔴 Critical fix (v2.0.2)

- **Screen no longer turns off during the timer** — `useKeepAwake` moved up to the root layout + explicit `activateKeepAwakeAsync` call. A tablet mounted on the wall stays on through sparring and drills.

### 🟢 Highlights from the 2.0.x Beta cycle

- **Unified PREP screen** — no more separate KID / ADULT / RESTING columns. All pairs in a single dense grid with **category color-coding** and a **legend in the topbar**:
  - 🟦 **KID GI** (blue)
  - 🩵 **KID NO-GI** (cyan)
  - 🟧 **ADULT GI** (orange)
  - 🟥 **ADULT NO-GI** (red)
  - 🟪 **MIXED** (gradient — KID + ADULT)
- **Pair GI rule** — a pair counts as GI only if **both** athletes are in GI; one NO-GI in the pair → the whole pair is NO-GI
- **Inline RESTING next to PREP** — who's resting is shown next to the phase header instead of a separate column (more room for pair tiles)
- **Two-mode player dropout** — in the "WHO'S OUT?" modal each player has two buttons:
  - **OUT** — removed from the rest of the session
  - **REST 1 ROUND** — automatically returns next round

### 🟢 Core features from 2.0.0 Beta

- **Language picker on launch** — PL / EN / PT (BR) visible from the first run
- **Three training modes** — SPARRING · TASK DRILLS (TRIADS / DUOS) · **DRILLS** (full-fledged mode with fixed pairs and A/B role swap each round)
- **Gender field (M / F)** in player card and **Gender-based fights** in sparring options (OFF / PRIORITY / ALWAYS)
- **Matchmaking priority slider** — SKILL ↔ WEIGHT (4 snaps)
- **Weight split** — optionally divides the mat into two weight groups
- **Fight order** — SIMILAR / DIFFERENT / RANDOM
- **No-rest (VIP)** in a clean pill layout with player names
- **End screen "THANK YOU — GOOD WORK!"** with return to menu
- **VERSION V2 panel** — contact, GitHub link, store link, short description
- **Optimised triad and duo cards** for 10.5" tablets — no scrolling at typical resolutions

---

## About the app

**Z NIM NIE ROBIĘ** ("I'm not rolling with him") is a tool for BJJ and grappling coaches who run trainings with a tablet mounted on the wall or by the mat. Instead of paper notes, a stopwatch and manually arranging pairs — one device does it all:

- **automatically matches pairs** based on weight, level, gi/no-gi and gender,
- **runs the timers** with sound cues for prep, work and rest,
- **rotates triads and duos** in task drills with a clear split between fighters and the resting person,
- **runs drills** with pairs picked once per session and A/B roles swapping every round,
- **displays everything readably** — big fonts, strong contrast, readable from several meters,
- **speaks Polish, English and Brazilian Portuguese**.

The app works offline, requires no account or login. Player data is stored locally on the device.

---

## Screenshots

Screenshots are available in the [Polish README](README.md#zrzuty-ekranu).

---

## Training modes

### ⚔️ Sparring

Classic sparring mode. Each round cycle:

1. **Prep** — pairs are displayed, time to walk to positions
2. **Work** — big timer, fight
3. **Rest** — recovery; the system generates and shows new pairs for the next round

The system remembers the history of fights and avoids repeating the same pairs. Extra options:

- **Matchmaking priority** — slider: SKILL ↔ WEIGHT (four snaps)
- **Fight order** — SIMILAR / DIFFERENT / RANDOM
- **Weight split** — splits the mat into two alternating weight groups
- **Gender-based fights** — OFF / PRIORITY / ALWAYS

### 🔄 Triad task drills

Three-person groups, six stages per round — full rotation. Each stage has two fighters and one resting/assisting:

| Stage | [A] BOTTOM | [B] TOP   | [C] REST  |
|:-----:|:----------:|:---------:|:---------:|
| 1     | Person 1   | Person 2  | Person 3  |
| 2     | Person 1   | Person 3  | Person 2  |
| 3     | Person 2   | Person 1  | Person 3  |
| 4     | Person 2   | Person 3  | Person 1  |
| 5     | Person 3   | Person 1  | Person 2  |
| 6     | Person 3   | Person 2  | Person 1  |

After 6 stages everyone fought everyone from both positions. Stage time = round time ÷ 6.

### 👥 Duo task drills

Simple A vs B pairs — two stages per round. After the first stage roles swap (whoever was on the bottom goes on top). Stage time = round time ÷ 2.

### 🥋 Drills

Pairs are picked **once per session** — same partner till the end. A/B roles swap every round. Ideal for repeating technique without resetting trust between partners every few minutes.

---

## Matchmaking engine

The matchmaker **does not randomise** — it picks pairs algorithmically by priority:

| Priority | Criterion |
|:--------:|-----------|
| 1 | **Avoid repeats** — fresh pairs come first; the system remembers the fight history |
| 2 | **Gi/No-gi** — GI fights GI, NO-GI fights NO-GI (gi is ignored when the option is off) |
| 3 | **Gender** — optionally women fight each other first (PRIORITY) or only each other (ALWAYS) |
| 4 | **Skill level** — close levels (BEG / INT / ADV / PRO) |
| 5 | **Weight** — close body mass |
| 6 | **Rest rotation** — fair distribution of who rests (with odd headcount) |
| 7 | **Mixed KID + ADULT pairs** — only when group size requires it |

The **MATCHMAKING PRIORITY** slider lets you smoothly weight skill vs weight (4 snaps: 0 / 33 / 67 / 100). When a repeat is mathematically unavoidable, the system picks the pair that hasn't fought each other for the longest time.

---

## Main features

- **Roster management** — add, edit and remove players from a tile-based view
- **Club database** — quickly add saved players with search and batch select
- **Categories** — KID and ADULT split with separate matchmaking
- **Gi/No-gi** — both supported with gi-matching priority
- **Levels** — BEG, INT, ADV, PRO
- **Gender** — M / F with optional priority for women's fights
- **Timer** — big, readable from several meters
- **Sound cues** — gong on work start, 10 s warning, gong on break, applause at the end
- **No-rest (VIP)** — mark players who don't rest between rounds
- **Player drop-out** — remove a player mid-session with automatic pair recalculation; **two modes**: OUT (removed) or REST 1 ROUND (returns next round)
- **DRILLS mode** — fixed pairs for the whole session, A/B role swap each round
- **Multilingual** — PL / EN / PT (BR) with picker on launch and from the bottom bar
- **Responsive layout** — optimised for 10.5" tablets, also works on phones and in browsers
- **Offline** — no account, no backend, data stored locally (AsyncStorage)

---

## Tech stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Framework   | [Expo](https://expo.dev/) + React Native    |
| Language    | TypeScript                                  |
| Routing     | Expo Router                                 |
| Local data  | AsyncStorage                                |
| Audio       | expo-av                                     |
| Build       | EAS Build                                   |
| Web hosting | Netlify                                     |
| Target      | Android (10.5" tablet), iOS, browser        |

---

## Project structure

```
app/
  (tabs)/
    index.tsx              # Main UI — screens, timers, pair grids
    i18n.ts                # Translations PL / EN / PT
    types.ts               # Domain types (RealPlayer, Match, SparringOptions, etc.)
    engine/
      matchmaker.ts        # Pair matching and rotation engine
assets/
  *.mp3                    # Training sounds (gong, warning, applause)
  images/                  # Icons and splash screen
docs/
  privacy-policy.md        # Privacy policy
  play-store/              # Google Play assets
Screenshots/               # Screenshots (v2.0.2 Beta)
Images/                    # Logo and app icons
plugins/                   # Expo plugins (e.g. ADI registration)
```

---

## Running the app

```bash
# Install dependencies
npm install

# Dev server
npx expo start

# Build APK (Android, for testing)
eas build --platform android --profile preview

# Production build (Android, .aab)
eas build --platform android --profile production

# Export web version
npx expo export --platform web
```

---

## Web version

The app is available online at:

**https://znimnierobie.pl**

The web version runs in the browser on desktop, tablet and phone. No install needed.

---

## Privacy

- No account or login required
- No data sent to external servers
- No analytics or trackers
- Player data stored only locally on the device

Full privacy policy: [docs/privacy-policy.md](docs/privacy-policy.md)

---

## License

All rights reserved. Source code published for review purposes only.

---

<p align="center">
  <b>Z NIM NIE ROBIĘ</b> · v2.0.2 Beta · BJJ training app<br/>
  Built with 🥋 on the mat and at the keyboard
</p>
