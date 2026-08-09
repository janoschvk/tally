# Tally

A private consumption tracker. Vite + React, no backend, data in `localStorage`.

## Run it

```bash
npm install
npm run dev
```

## Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel            # first run links the project
vercel --prod
```

Vercel detects Vite automatically: build command `npm run build`, output `dist`. Nothing to configure.

## Install on iPhone

Open the deployed URL in **Safari** (not Chrome — only Safari can add to the Home Screen on iOS) → Share → **Add to Home Screen**. It launches full-screen with no address bar.

Re-adding after a deploy isn't necessary; the service worker picks up new versions on the next launch.

## Structure

```
src/
  storage.js            all persistence — the only file that knows about localStorage
  dates.js              local-time bucketing for day/week/month/year
  App.jsx               state, tabs, export/import
  components/
    TodayView.jsx       tap-to-log cards
    HistoryView.jsx     filtering and totals
    SettingsView.jsx    configurable items, backup, delete
    Tally.jsx           the tally-mark renderer
public/
  manifest.webmanifest  makes it installable, display: standalone
  sw.js                 offline caching
```

## Data model

```js
item  = { id, label, color }
entry = { id, itemId, at }   // `at` is an ISO/UTC instant
```

One row per event. Daily counts are derived, never stored — you can always aggregate
timestamps down to counts, but you can't recover timestamps you didn't keep.

**Always bucket entries with the helpers in `dates.js`.** `at` is UTC; "today" is a
local-time question. Slicing the ISO string to get a date puts anything logged between
local midnight and the UTC offset on the wrong day.

## Two things to know

**Data lives in this browser on this device.** No sync, no account, no recovery. iOS can
evict site storage for apps left unopened for weeks. The export button is your backup —
use it occasionally.

**`storage.js` is synchronous** because `localStorage` is. If you ever add a real backend,
those functions become `async`, which ripples into every component that calls them. That's
the cost of starting sync, and it's the right trade for a single-device tracker — but it's
the reason to keep every read and write inside that one file.
