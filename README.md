# Leonida Trophy Ledger — GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun entry](https://make.fun/badge-entry.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all **55 Grand Theft Auto VI trophies** on PlayStation 5
(1 platinum, 2 gold, 6 silver, 46 bronze — 28 hidden, 1 missable), built for the
[make.fun bounty gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01).

## What it does

- **Guide & tracker** — every trophy with its official name and description, a guide in
  this guide's own words, numbered steps, difficulty (1–5), a time estimate, and the
  published sources it draws on — named as text, with no links anywhere, so the whole
  guide works offline.
- **One missable trophy, flagged everywhere** — Positive Mental Attitude (meditate at
  every spot before the final mission). The banner, the Missable filter and the roadmap
  all point at it first.
- **Roadmap to the platinum** — 7 ordered steps across 3 phases (Story First 60–80 h,
  Leonida Cleanup 100–150 h, Platinum Push 40–60 h), plus the 100% completion checklist.
- **Tracker** — click a trophy to mark it earned (saved in localStorage), with search,
  filters by kind and grade, a hide-earned toggle, and a spoiler-safe mode that hides
  story trophy names and descriptions until you earn them.
- **Progress tools** — export your progress to JSON, import it back, or reset it.
- **Honest unknowns** — Bad Luck, I Guess has no confirmed method yet and says so;
  Fair Game and Ten Pin are marked as community leads, not confirmed facts.

## How to use it

Open `app/index.html` in a desktop browser. No server, no build step, no network:
the app only fetches its own `app/data/trophies.json` and `app/data/roadmap.json`.

```sh
# or serve it locally
node serve.ts
# then open http://localhost:8080
```

## Build

`main.ts` (Node 22+, standard library only) copies `app/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Run it twice — the dossier is byte-identical on repeat runs.

## Screenshots

Four real renders of the app in headless Chrome (1280×800), listed in `shots.json`:

1. `1-cover.jpg` — guide view with progress and filters
2. `2-roadmap.jpg` — the 7-step roadmap to the platinum
3. `3-detail.jpg` — one trophy open, with cited steps (Capital Offense)
4. `4-spoiler.jpg` — spoiler-safe mode on

## Sources

Guides cite their published sources by name beside each trophy: Exophase, Push Square,
TrueTrophies, PSNProfiles, KeenGamer, GTABase, GameRant, GameSpot and PowerPyx
(never listed first). Trophy names and descriptions are shown exactly as PlayStation
publishes them. No game art, logos or screenshots are used — the look is original CSS.

## Owner

Built by Faldyreza for the make.fun bounty. Referral: https://make.fun/r/rvk09evk
