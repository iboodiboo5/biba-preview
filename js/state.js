// The Combination lives in the URL hash. This module is the only code that
// reads or writes location.hash.
//
// The hash is one bare token of dot-separated parts, because a claude.ai
// artifact link passes only [A-Za-z0-9._~-] through to location.hash:
//
//   #home.1.biba.biba.photo.desktop               page.layout.dir.name.img.frame
//   #piece.1.biba.anaar.photo.phone.<piece>        + the Piece, on the Piece page only
//   #home.1.biba.biba.photo.desktop.favourites     + the Favourites view
//
// The first six parts are positional. Any part after them is recognised by its
// value (a Piece key, or a view name), so their order does not matter; unknown
// ones (round 1's `square`/`arch` Picture shape) are ignored.
// Old links in the `#page=piece&piece=gulnar&dir=c&…` form still parse.
// Unknown or missing values fall back to DEFAULTS, one part at a time, so a
// round-1 link (`#home.2.c.c.photo.desktop.square`) opens in Biba.
//
// Round 2 has one Direction, one Layout per Page and no Imagery switch, but the
// hash keeps their positions so every older link still parses. The Name sits
// where round 1 kept the Wordmark. The last Piece shown is remembered while the
// reviewer is on other Pages, so returning to the Piece page shows it again.

import { PAGES, MAX_LAYOUTS, pageByKey } from './pages.js';
import { PIECES, pieceByKey } from './pieces.js';
import { NAMES, DEFAULT_NAME, brandFor } from './brand.js';

// The one Direction. Round 1's b, c and d fall back to it.
export const DIRECTIONS = [{ key: 'biba', label: 'Biba' }];
// Photographs only; the position is kept so old links parse.
export const IMAGERY = [{ key: 'photo', label: 'Photo' }];
// The tool's own views. `site` is the simulated website; `favourites` is the
// Favourites list. Not part of the Combination.
export const VIEWS = ['site', 'favourites'];
export const FRAMES = [
  { key: 'desktop', label: 'Desktop' },
  { key: 'phone', label: 'Phone' },
];

// On a real phone (a window under 600px wide) the Frame is native: the site
// fills the screen at real size, with no phone drawn inside the phone, and
// Desktop can't be picked. The Combination then always says `phone`. The same
// width is the breakpoint in styles/toolbar.css.
export const NARROW_QUERY = '(max-width: 599px)';
export const NATIVE_FRAME_LABEL = 'Phone (actual size)';
const narrowMedia = typeof matchMedia === 'function' ? matchMedia(NARROW_QUERY) : null;

/** True when the Frame is native (the window itself is phone-sized). */
export function isNarrow() {
  return !!narrowMedia?.matches;
}

export const DEFAULTS = {
  page: 'home',
  piece: PIECES[0].key,
  dir: 'biba',
  layout: 1,
  name: DEFAULT_NAME,
  img: 'photo',
  frame: 'desktop',
  view: 'site',
};

const oneOf = (keys) => (v) => (keys.includes(v) ? v : undefined);

// Every field of the hash.
//   pos    position among the leading parts (fields without one are trailing
//          parts, recognised by value, so their values must not overlap)
//   when   limits a field to the states it matters in (left out of the hash otherwise)
// To add a field, add an entry here and a DEFAULTS value.
export const FIELDS = {
  page: { pos: 0, parse: oneOf(PAGES.map((p) => p.key)) },
  layout: {
    pos: 1,
    parse: (v) => (/^\d+$/.test(v ?? '') && +v >= 1 && +v <= MAX_LAYOUTS ? +v : undefined),
  },
  dir: { pos: 2, parse: oneOf(DIRECTIONS.map((d) => d.key)) },
  name: { pos: 3, parse: oneOf(NAMES.map((n) => n.key)) },
  img: { pos: 4, parse: oneOf(IMAGERY.map((i) => i.key)) },
  frame: { pos: 5, parse: oneOf(FRAMES.map((f) => f.key)) },
  piece: { parse: oneOf(PIECES.map((p) => p.key)), when: (s) => s.page === 'piece' },
  view: { parse: oneOf(VIEWS.filter((v) => v !== DEFAULTS.view)), when: (s) => s.view !== DEFAULTS.view },
};

const ENTRIES = Object.entries(FIELDS);
const LEADING = ENTRIES.filter(([, f]) => f.pos != null).sort((a, b) => a[1].pos - b[1].pos);
const TRAILING = ENTRIES.filter(([, f]) => f.pos == null);

/** Raw values by field name, from either hash form. */
function rawValues(hash) {
  const text = String(hash ?? '').replace(/^#/, '');
  if (text.includes('=')) {
    // Old form: #page=piece&piece=gulnar&dir=c&layout=2&wm=b&img=photo&frame=desktop
    const params = new URLSearchParams(text);
    return Object.fromEntries(ENTRIES.map(([name]) => [name, params.get(name)]));
  }
  const parts = text ? text.split('.') : [];
  const raw = {};
  LEADING.forEach(([name], i) => (raw[name] = parts[i]));
  for (const part of parts.slice(LEADING.length)) {
    const match = TRAILING.find(([name, f]) => raw[name] == null && f.parse(part) !== undefined);
    if (match) raw[match[0]] = part;
  }
  return raw;
}

export function parse(hash) {
  const raw = rawValues(hash);
  const s = {};
  for (const [name, field] of ENTRIES) s[name] = field.parse(raw[name] ?? undefined) ?? DEFAULTS[name];
  return s;
}

export function serialise(s) {
  const full = { ...DEFAULTS, ...s };
  const parts = LEADING.map(([name]) => full[name]);
  for (const [name, field] of TRAILING) if (!field.when || field.when(full)) parts.push(full[name]);
  return `#${parts.join('.')}`;
}

export function effectiveLayout(s) {
  return Math.min(s.layout, pageByKey(s.page).layouts);
}

/**
 * A Combination read from outside (a stored Favourite), checked against the
 * known values. Returns the full Combination, or null if any part is unknown.
 * `frame` may be missing (older Favourites) and falls back to Desktop.
 */
export function validCombination(c) {
  if (!c || typeof c !== 'object') return null;
  const page = FIELDS.page.parse(c.page);
  const dir = FIELDS.dir.parse(c.dir);
  const name = FIELDS.name.parse(c.name);
  const img = FIELDS.img.parse(c.img);
  const frame = c.frame == null ? DEFAULTS.frame : FIELDS.frame.parse(c.frame);
  const layout = Number.isInteger(c.layout) ? c.layout : FIELDS.layout.parse(String(c.layout ?? ''));
  if (!page || !dir || !name || !img || !frame) return null;
  if (!(layout >= 1 && layout <= pageByKey(page).layouts)) return null;
  const combo = { page, layout, dir, name, img, frame };
  if (page === 'piece') {
    const piece = FIELDS.piece.parse(c.piece);
    if (!piece) return null;
    combo.piece = piece;
  }
  return combo;
}

/* ---------- The current Combination ---------- */

let lastPiece = DEFAULTS.piece;

export function current() {
  const s = parse(location.hash);
  if (isNarrow()) s.frame = 'phone';
  if (s.page === 'piece') lastPiece = s.piece;
  else s.piece = lastPiece;
  return s;
}

/** Hash for the current Combination with `patch` applied. Use for every in-site link.
 *  Every link lands back on the site unless the patch asks for another view. */
export function href(patch = {}) {
  return serialise({ ...current(), view: DEFAULTS.view, ...patch });
}

/** Navigate to the current Combination with `patch` applied. */
export function go(patch = {}, { replace = false } = {}) {
  const next = href(patch);
  if (next === location.hash) return;
  if (replace) {
    history.replaceState(history.state, '', next);
    notify();
  } else {
    location.hash = next;
  }
}

/* ---------- Labels (the toolbar and the Favourites view share these) ---------- */

/** One-line name for a Combination: "Home · Biba", or "Piece · <Piece> · Anaar". */
export function label(s) {
  const parts = [pageByKey(s.page).label];
  if (s.page === 'piece') parts.push(pieceByKey(s.piece).name);
  parts.push(brandFor(s.name).name);
  return parts.join(' · ');
}

/** The rest of the Combination: the Frame ("Desktop" or "Phone"). */
export function detailLabel(s) {
  return FRAMES.find((f) => f.key === s.frame)?.label ?? FRAMES[0].label;
}

/** The Frame as the toolbar shows it now: "Phone (actual size)" on a real phone. */
export function liveDetailLabel(s) {
  return isNarrow() ? NATIVE_FRAME_LABEL : detailLabel(s);
}

/* ---------- Change notifications ---------- */

const listeners = new Set();
export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  const s = current();
  listeners.forEach((cb) => cb(s));
}

/** Rewrite the hash in its canonical form (old or partial links), without adding history.
 *  Keeps the entry's history.state (main.js keeps its scroll bookkeeping there). */
function canonicalise() {
  const canonical = serialise(current());
  if (canonical !== location.hash) history.replaceState(history.state, '', canonical);
}

window.addEventListener('hashchange', () => {
  canonicalise();
  notify();
});

// Turning a phone or resizing a window across 600px switches native Frame on or off.
narrowMedia?.addEventListener('change', () => {
  canonicalise();
  notify();
});

/** Call once at boot. */
export function init() {
  canonicalise();
  return current();
}
