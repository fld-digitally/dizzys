# Swash Studio

Swash Studio is a standalone Vite + React + TypeScript web app for browsing decorative font glyphs. Upload a `.ttf` or `.otf` file, inspect all glyphs exposed by `opentype.js` (including non-Unicode alternates and swashes), preview a selected glyph, and export its outline as an SVG.

> Only upload fonts you have the right to use.

## Features

- Client-side font parsing with `opentype.js`; font files are never uploaded to a server.
- Upload input for `.ttf` and `.otf` files.
- Responsive glyph grid that prioritizes Unicode glyphs while still including non-Unicode glyphs.
- Glyph metadata: name, Unicode value when available, and font index.
- Large selected-glyph preview.
- SVG export using the selected glyph's outline path data and font metrics for a proportional `viewBox`.

## Setup

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

## Notes

The app is intentionally browser-only. It reads the selected font with the File API, parses the `ArrayBuffer` in memory with `opentype.js`, and renders/export paths directly in the browser.
