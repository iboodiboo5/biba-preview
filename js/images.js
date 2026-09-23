// Image resolver. The only place that knows image paths.
//
//   Piece images:  assets/img/<piece>-front.jpg | -detail.jpg | -print.jpg
//   Page images:   assets/img/home-1..4.jpg (Cover), make-1..3.jpg (how it's made), story-1..3.jpg
//   Logos:         assets/brand/ (LOGO, one entry per Name; see brand.js)
//
// A name renders its real file only if it is listed in image-manifest.js
// (regenerate with `python3 tools/make-webp.py`). Otherwise, or if the
// file fails to load, a sample stand-in is shown and the <img> gets `.is-standin`.
//
// Weight (round 3): every photo has WebPs at 480/960/1400 wide (never wider than
// its source) beside the JPEG, written by tools/make-webp.py and listed in WEBP.
// img() hands them to the browser as srcset + sizes and keeps the JPEG as src,
// the fallback. Lazy images use sizes="auto" (the browser measures the box),
// with a guess after it for browsers that can't. Two more savings, with no
// Page change:
//   - a lazy image inside an aria-hidden container (the banner's waiting slides)
//     waits until the container is shown or its loading turns 'eager'; the slide
//     after the one showing warms up once the shopper interacts
//   - the piece card's hover-only close-up (.piece-card__alt) is not rendered
//     on touch screens, where it can never show

import { AVAILABLE, WEBP } from './image-manifest.js';
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
// The logos on the page are small WebPs made from those PNGs by
// tools/make-webp.py; the tab and home-screen icons stay PNG.
export const LOGO = {
  biba: {
    src: 'assets/brand/biba-logo.webp',
    knockout: 'assets/brand/biba-logo-knockout.webp',
    star: 'assets/brand/biba-star.webp',
    // The logo with the star cut out, for the wordmark's twinkling star overlay (wordmark.js).
    plain: 'assets/brand/biba-logo-plain.webp',
    knockoutPlain: 'assets/brand/biba-logo-knockout-plain.webp',
    favicon: 'assets/brand/biba-favicon-64.png',
    touchIcon: 'assets/brand/biba-apple-touch-icon.png',
  },
  anaar: {
    src: 'assets/brand/logo-mark.webp',
    knockout: 'assets/brand/logo-mark-cream.webp',
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

/** The WebP srcset for a resolved .jpg path ('assets/img/home-1.jpg'), or '' if it has none. */
export function srcsetFor(src) {
  const base = src.replace(/\.jpg$/, '');
  const widths = WEBP[base];
  return widths ? widths.map((w) => `${base}-${w}w.webp ${w}w`).join(', ') : '';
}

// How wide an image shows, for browsers that can't measure it themselves.
const SIZES = {
  full: '100vw', // the Home banner
  half: '(max-width: 600px) 100vw, 50vw', // a lead photo, a still
  card: '(max-width: 600px) 50vw, 25vw', // Piece images in cards and rows
};

function sizesFor(name, { sizes, kind, loading }) {
  if (sizes) return sizes;
  if (name.startsWith('home-')) return SIZES.full;
  if (loading !== 'lazy') return SIZES.half;
  // Lazy: the browser measures the laid-out box; the guess is only its fallback.
  return `auto, ${kind ? SIZES.card : SIZES.half}`;
}

const TOUCH = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;

/**
 * <img> HTML for an image name.
 * opts: alt, cls, kind (a Piece image's 'front'|'detail'|'print'; set by pieceImg), ground,
 *       loading ('lazy' default, pass 'eager' for heroes), position (object-position),
 *       sizes (the <img> sizes attribute; a sensible guess by default),
 *       hoverOnly (only ever seen on hover, so rendered as nothing on touch screens;
 *       true by default for the piece card's .piece-card__alt).
 */
export function img(name, opts = {}) {
  const { alt = '', cls = '', kind = '', loading = 'lazy', position } = opts;
  const hoverOnly = opts.hoverOnly ?? cls.split(' ').includes('piece-card__alt');
  if (hoverOnly && TOUCH) return '';
  const r = resolve(name, opts);
  const classes = [cls, r.standin ? 'is-standin' : ''].filter(Boolean).join(' ');
  const srcset = srcsetFor(r.src);
  const sized = srcset ? ` srcset="${srcset}" sizes="${sizesFor(name, { ...opts, loading })}"` : '';
  return `<img src="${r.src}"${sized} data-fallback="${r.fallback}" data-name="${name}"${kind ? ` data-kind="${kind}"` : ''}${
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

// Safety net: an <img> whose WebP fails drops its srcset and shows its JPEG;
// one whose JPEG fails swaps to its stand-in once.
document.addEventListener(
  'error',
  (e) => {
    const el = e.target;
    if (!(el instanceof HTMLImageElement) || !el.dataset.fallback) return;
    if (el.hasAttribute('srcset')) {
      el.removeAttribute('srcset');
      return;
    }
    if (el.getAttribute('src') === el.dataset.fallback) return;
    el.classList.add('is-standin');
    el.src = el.dataset.fallback;
  },
  true,
);

/* ---------- Waiting images ----------
   Stacked carousel slides all count as "in view" for the browser's lazy loading,
   so every slide would load at once. A lazy image rendered inside an aria-hidden
   container is held on a 1px placeholder until the container is shown or its
   loading is set to 'eager'. On the shopper's first tap, click or key, the
   container right after a showing one (the next slide) warms up; each time a
   container is shown, the one after it warms up too. */

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const HIDDEN = '[aria-hidden="true"]';

function hold(el) {
  if ('hold' in el.dataset || el.loading !== 'lazy' || !el.closest(HIDDEN)) return;
  // A fresh <img> without them: Chrome leaves one whose srcset or loading is
  // removed reading 0 wide, like a broken image. The original, detached before
  // its lazy load starts, never fetches.
  const c = document.createElement('img');
  for (const { name, value } of el.attributes) {
    if (!['src', 'srcset', 'sizes', 'loading', 'decoding'].includes(name)) c.setAttribute(name, value);
  }
  c.dataset.hold = el.getAttribute('srcset') || '';
  c.dataset.holdSrc = el.getAttribute('src');
  c.dataset.holdSizes = el.getAttribute('sizes') || '';
  c.src = PIXEL; // loads at once, so the placeholder counts as loaded
  el.replaceWith(c);
}

function wake(el) {
  if (!('hold' in el.dataset)) return;
  const { hold: srcset, holdSrc, holdSizes } = el.dataset;
  delete el.dataset.hold;
  delete el.dataset.holdSrc;
  delete el.dataset.holdSizes;
  if (!el.hasAttribute('loading')) el.loading = 'lazy';
  el.decoding = 'async';
  if (holdSizes) el.sizes = holdSizes;
  if (srcset) el.srcset = srcset;
  el.src = holdSrc;
}

const heldIn = (root) => (root?.querySelectorAll ? root.querySelectorAll('img[data-hold]') : []);

function warmNext() {
  document.querySelectorAll('img[data-hold]').forEach((el) => {
    const prev = el.closest(HIDDEN)?.previousElementSibling;
    if (prev && !prev.matches(HIDDEN)) wake(el);
  });
}

if (typeof MutationObserver === 'function') {
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') {
        for (const n of r.addedNodes) {
          if (n instanceof HTMLImageElement) hold(n);
          else if (n.querySelectorAll) n.querySelectorAll('img[loading="lazy"]').forEach(hold);
        }
      } else if (r.attributeName === 'loading') {
        if (r.target instanceof HTMLImageElement && r.target.getAttribute('loading') === 'eager') wake(r.target);
      } else if (!r.target.matches(HIDDEN)) {
        // aria-hidden removed: this container is showing; the next one warms up.
        heldIn(r.target).forEach(wake);
        heldIn(r.target.nextElementSibling).forEach(wake);
      }
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden', 'loading'],
  });
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, warmNext, { capture: true, passive: true });
}
