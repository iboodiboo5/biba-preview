// Image resolver. The only place that knows image paths.
//
//   Piece images:  assets/img/<piece>-front.jpg | -detail.jpg | -print.jpg
//   Page images:   assets/img/home-1..4.jpg (Cover), make-1..3.jpg (how it's made), story-1..3.jpg
//   Logos:         assets/brand/ (LOGO, one entry per Name; see brand.js)
//
// A name renders its real file only if it is listed in image-manifest.js
// (regenerate with `python3 tools/update-image-manifest.py`). Otherwise, or if the
// file fails to load, a sample stand-in is shown and the <img> gets `.is-standin`.

import { AVAILABLE } from './image-manifest.js';
import { esc } from './ui.js';

const IMG_DIR = 'assets/img/';
// Stand-ins: plain gingham panels (editorial = pink, monochrome = butter).
const SAMPLE = {
  editorial: 'assets/img/standin-editorial.jpg',
  monochrome: 'assets/img/standin-monochrome.jpg',
};
const SWATCH = {
  cream: 'assets/prints/swatch-cream.jpg',
  blush: 'assets/prints/swatch-blush.jpg',
};

// Grounds that take the blush stand-ins when a file is missing.
const WARM_GROUNDS = new Set(['pink', 'peach', 'lilac']);

// Per Name: `src` on light grounds, `knockout` on photographs, `favicon` and
// `touchIcon` for the browser tab. Biba's is cut from the client's JPG
// (docs/client/round-2/from-client/biba-logo.jpg) to a transparent PNG.
export const LOGO = {
  biba: {
    src: 'assets/brand/biba-logo.png',
    knockout: 'assets/brand/biba-logo-knockout.png',
    star: 'assets/brand/biba-star.png',
    // The logo with the star cut out, for the wordmark's twinkling star overlay (wordmark.js).
    plain: 'assets/brand/biba-logo-plain.png',
    knockoutPlain: 'assets/brand/biba-logo-knockout-plain.png',
    favicon: 'assets/brand/biba-favicon-64.png',
    touchIcon: 'assets/brand/biba-apple-touch-icon.png',
  },
  anaar: {
    src: 'assets/brand/logo-mark.png',
    knockout: 'assets/brand/logo-mark-cream.png',
    favicon: 'assets/brand/favicon-64.png',
    touchIcon: 'assets/brand/apple-touch-icon.png',
  },
};

function hashIndex(str, n) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

function standIn(name, { ground, kind } = {}) {
  // Pieces' grounds (pink, butter, mint…) map onto the two stand-in families.
  const warm = WARM_GROUNDS.has(ground);
  if (kind === 'print' || name.endsWith('-print')) return SWATCH[warm ? 'blush' : 'cream'];
  if (ground) {
    // Pieces: cool and butter grounds on the neutral sample, warm grounds on the warm one.
    return (kind === 'detail' ? !warm : warm) ? SAMPLE.monochrome : SAMPLE.editorial;
  }
  return hashIndex(name, 2) ? SAMPLE.monochrome : SAMPLE.editorial;
}

/** { src, fallback, standin } for an image name like 'home-1' or 'gulnar-front'. */
export function resolve(name, opts = {}) {
  const fallback = standIn(name, opts);
  if (AVAILABLE.has(name)) return { src: `${IMG_DIR}${name}.jpg`, fallback, standin: false };
  return { src: fallback, fallback, standin: true };
}

/** Image name for a Piece: 'front', 'detail' or 'print'. */
export function pieceImageName(piece, kind = 'front') {
  return `${piece.key}-${kind}`;
}

/**
 * <img> HTML for an image name.
 * opts: alt, cls, kind (a Piece image's 'front'|'detail'|'print'; set by pieceImg), ground,
 *       loading ('lazy' default, pass 'eager' for heroes), position (object-position).
 */
export function img(name, opts = {}) {
  const { alt = '', cls = '', kind = '', loading = 'lazy', position } = opts;
  const r = resolve(name, opts);
  const classes = [cls, r.standin ? 'is-standin' : ''].filter(Boolean).join(' ');
  return `<img src="${r.src}" data-fallback="${r.fallback}" data-name="${name}"${kind ? ` data-kind="${kind}"` : ''}${
    classes ? ` class="${classes}"` : ''
  } alt="${esc(alt)}" loading="${loading}" decoding="async"${position ? ` style="object-position:${position}"` : ''}>`;
}

/** <img> HTML for one of a Piece's images. */
export function pieceImg(piece, kind = 'front', opts = {}) {
  return img(pieceImageName(piece, kind), {
    alt: opts.alt ?? `${piece.name}, ${kind === 'detail' ? 'print detail' : 'short kurta and shalwar'}`,
    ...opts,
    kind,
    ground: piece.ground,
  });
}

// Safety net: any <img> that fails swaps to its stand-in once.
document.addEventListener(
  'error',
  (e) => {
    const el = e.target;
    if (!(el instanceof HTMLImageElement) || !el.dataset.fallback) return;
    if (el.getAttribute('src') === el.dataset.fallback) return;
    el.classList.add('is-standin');
    el.src = el.dataset.fallback;
  },
  true,
);
