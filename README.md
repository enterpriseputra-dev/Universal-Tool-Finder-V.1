# Universal Power Tool Parts Finder

Offline-first parts finder for bearing store staff. Instantly search bearings, armatures, carbon brushes, and V-belts from partial dimensions using tolerance-based fuzzy search.

## Features

- **Bearings** — search by inner (ID), outer (OD), and width with configurable tolerance
- **Armatures** — search by multiple shaft and stack dimensions
- **Carbon Brushes** — search by thickness, width, length, and spring diameter
- **V-Belts** — search by Lp, Li, La, top width, and height
- **Changes tab** — admin audit log of all add/edit/delete actions
- **Admin mode** — add, edit, and delete rows; add custom columns; manage custom tabs; drag to reorder columns
- **Import/Export** — CSV import and export for each catalogue
- **Offline-first** — all data stored in browser localStorage, no internet required

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [npm](https://www.npmjs.com/) 10 or later (comes with Node.js)

### Install and run

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production (static files)

```bash
npm run build
```

The static bundle is output to `dist/`. Serve `dist/index.html` with any static web server — no backend required.

### Run tests

```bash
npm test
```

## Notes

- All data is stored in `localStorage` under the `ptpf:` key prefix. Nothing is sent to any server.
- The admin password is set in the Admin tab within the app.
