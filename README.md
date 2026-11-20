# GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun entry](https://make.fun/badge-entry.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun leaderboard](https://make.fun/badge-leaderboard.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI
(1 platinum, 2 gold, 6 silver, 46 bronze) — built for the
[make.fun bounty gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01).

## What it is

- **Checklist tracker** — every trophy with its official name, description and grade,
  saved in the browser (localStorage), with export to a file and import back.
- **Filters** — by kind (story, missable, collectibles, activities, side & misc, online),
  by grade, and by free-text search across names, guides and sources.
- **Spoiler mode** — hides the names and descriptions of story trophies until you earn
  them. In spoiler mode no grade or kind chip is shown on a hidden card.
- **Roadmap to the Platinum** — all three phases with hour estimates, plus a
  seven-step platinum route in order, from the Chapter 1 meditation to the final cleanup.
- **100% Checklist tab** — the blocks behind A Long Road, each with its required count.
- **A cited guide per trophy** — written in this guide's own words, naming its sources
  beside the trophy (PowerPyx, Push Square, KeenGamer, Exophase, PSNProfiles, GTADB,
  Sixshore, GameMapa, Vice City Hustle, GameSpot, GameRant, DamnModz, GTASpotter,
  BoostingFactory). Each trophy also carries a difficulty rating, a time estimate and
  its Exophase rarity. Video walkthrough links appear only where a real video was
  verified — never a guessed URL.
- **Honest unknowns** — one trophy, Bad Luck, I Guess, has no confirmed unlock method
  yet and is marked unknown rather than guessed. Ten Pin carries its best lead,
  clearly flagged as unconfirmed.

## Facts that shape the route

- Difficulty 4/10, about 200 hours to the platinum (PowerPyx; Push Square says 300+).
- One playthrough is enough. No online trophies. Cheats disable trophies and saving.
- One trophy can be missed: **Positive Mental Attitude** — the Chapter 1 balcony
  meditation after the mission Down to Earth. It is flagged on its card, in the
  roadmap and in the banner above the checklist.
- No mission replay, so keep a manual save at the start and end of every chapter.

## Run it

Static files, no build step. Serve `app/` with any static server and open
`index.html` in desktop Chrome. It works with the network off: the app loads only
its own files.

```sh
node serve.ts
# opens http://localhost:8080
```

## How it is built

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to
`/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `/output/dossier.json` with
`buildDossier` from `vendor/makefun-frontend.ts`.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real headless-Chrome renders of this app at
1280×800: the checklist (cover), the roadmap, a trophy detail, and spoiler mode.

## Sources

Trophy names, descriptions and grades are PlayStation's own words (official list
published 18 November 2026, via Exophase and PSNProfiles). Guides are this
entry's own words; each trophy names the published guides it draws on. No
Rockstar logo or artwork is used — the look is this guide's own.

## Owner

Built by **Faldyreza** ([@fldyrza](https://make.fun/r/rvk09evk) on make.fun) for the
gta6-trophy-guide-01 bounty. Play with the referral link:
https://make.fun/r/rvk09evk

License: MIT.
