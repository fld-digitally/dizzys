import React, { ChangeEvent, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import opentype, { Font, Glyph } from 'opentype.js';
import './styles.css';

type GlyphItem = { glyph: Glyph; index: number; name: string; unicode?: number };

const EXPORT_EM_SIZE = 1000;

function glyphUnicode(glyph: Glyph): number | undefined {
  if (typeof glyph.unicode === 'number') return glyph.unicode;
  const unicodes = glyph.unicodes as number[] | undefined;
  return unicodes?.length ? unicodes[0] : undefined;
}

function unicodeLabel(value?: number) {
  if (typeof value !== 'number') return 'No Unicode';
  return `U+${value.toString(16).toUpperCase().padStart(4, '0')}`;
}

function displayChar(value?: number) {
  if (typeof value !== 'number') return '◇';
  try {
    return String.fromCodePoint(value);
  } catch {
    return '◇';
  }
}

function getGlyphs(font: Font): GlyphItem[] {
  // opentype.js exposes every glyph in font.glyphs, including private alternates,
  // swashes, ligatures, and other glyphs that may not be mapped to Unicode. We
  // keep all glyphs, then sort Unicode-mapped glyphs first for easier browsing.
  const glyphs: GlyphItem[] = [];
  for (let index = 0; index < font.glyphs.length; index += 1) {
    const glyph = font.glyphs.get(index);
    glyphs.push({
      glyph,
      index,
      name: glyph.name || `glyph-${index}`,
      unicode: glyphUnicode(glyph),
    });
  }

  return glyphs.sort((a, b) => {
    const aHasUnicode = typeof a.unicode === 'number';
    const bHasUnicode = typeof b.unicode === 'number';
    if (aHasUnicode !== bHasUnicode) return aHasUnicode ? -1 : 1;
    if (aHasUnicode && bHasUnicode && a.unicode !== b.unicode) {
      return (a.unicode ?? 0) - (b.unicode ?? 0);
    }
    return a.index - b.index;
  });
}

function glyphPathData(glyph: Glyph, size: number) {
  // Drawing at y=0 places the glyph on the baseline. Negative y moves the
  // outline upward in SVG coordinates, matching typical font ascender layout.
  return glyph.getPath(0, 0, size).toPathData(3);
}

function makeGlyphSvg(item: GlyphItem, font: Font) {
  const pathData = glyphPathData(item.glyph, EXPORT_EM_SIZE);
  const scale = EXPORT_EM_SIZE / font.unitsPerEm;
  const ascender = font.ascender * scale;
  const descender = font.descender * scale;
  const advanceWidth = (item.glyph.advanceWidth || font.unitsPerEm) * scale;
  const height = ascender - descender;

  // The viewBox uses the scaled advance width and font vertical metrics so the
  // exported outline preserves proportions and includes ascenders/descenders.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-ascender} ${advanceWidth} ${height}" role="img" aria-label="${item.name}">
  <path d="${pathData}" fill="currentColor" />
</svg>
`;
}

function downloadSvg(item: GlyphItem, font: Font) {
  const svg = makeGlyphSvg(item, font);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${item.name || `glyph-${item.index}`}.svg`.replace(/[^a-z0-9_.-]/gi, '_');
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [font, setFont] = useState<Font | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<GlyphItem | null>(null);

  const glyphs = useMemo(() => (font ? getGlyphs(font) : []), [font]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setSelected(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = opentype.parse(buffer);
      setFont(parsed);
    } catch (err) {
      setFont(null);
      setError(err instanceof Error ? err.message : 'Unable to parse this font.');
    }
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Client-side font explorer</p>
          <h1>Swash Studio</h1>
          <p className="intro">Upload a TTF or OTF font, browse every exposed glyph, preview decorative alternates, and export outlines as SVG.</p>
          <p className="license">Only upload fonts you have the right to use.</p>
        </div>
        <label className="upload">
          <span>Choose font</span>
          <input type="file" accept=".ttf,.otf,font/ttf,font/otf" onChange={handleUpload} />
        </label>
      </header>

      {error && <section className="notice error">{error}</section>}
      {font && <section className="notice">Loaded <strong>{fileName}</strong> · {glyphs.length} glyphs found</section>}

      <section className="workspace">
        <aside className="preview" aria-live="polite">
          {selected && font ? (
            <>
              <div className="preview-card">
                <svg viewBox={`0 ${-font.ascender} ${selected.glyph.advanceWidth || font.unitsPerEm} ${font.ascender - font.descender}`}>
                  <path d={selected.glyph.getPath(0, 0, font.unitsPerEm).toPathData(3)} />
                </svg>
              </div>
              <h2>{selected.name}</h2>
              <p>{unicodeLabel(selected.unicode)} · index {selected.index}</p>
              <button onClick={() => downloadSvg(selected, font)}>Export SVG</button>
            </>
          ) : (
            <div className="empty-state">Upload a font, then select a glyph to preview and export it.</div>
          )}
        </aside>

        <section className="grid" aria-label="Glyph grid">
          {glyphs.map((item) => (
            <button key={item.index} className={`glyph ${selected?.index === item.index ? 'selected' : ''}`} onClick={() => setSelected(item)}>
              <span className="glyph-char">{displayChar(item.unicode)}</span>
              <span className="glyph-name">{item.name}</span>
              <span className="glyph-meta">{unicodeLabel(item.unicode)} · #{item.index}</span>
            </button>
          ))}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
