# Benjamin Woolston — Portfolio & Extras

This repo powers the portfolio as well as small side pages that live on subpaths.

## Develop locally

```bash
npm install
npm run start
```

Parcel will serve every page that sits under `src/`. The new Wooly Walking Challenge lives at `/w/` (visit `http://localhost:1234/w/index.html` while running the dev server).

## Wooly Walking Challenge 2025

- **Login**: usernames e.g. `ben_woolston`, default password `Password1`.
- **Data**: stored in the browser via `localStorage`. Use the backup/export buttons to move data between devices.
- **Dates**: challenge runs 6 Oct – 21 Dec 2025 with a stealth phase starting 7 Dec.
- **Build output**: `npm run build` will generate `/dist/w/index.html`. Deploy that folder under the `w` subpath (for example `woolston.dev/w/`).

## Build

```bash
npm run build
```

The build command bundles `index.html`, `projects.html`, and `w/index.html`.
