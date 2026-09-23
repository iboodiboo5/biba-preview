// Shared building blocks for Layouts: an html`` helper, media boxes, and
// components used on more than one Page (piece card, the "how it's made"
// video still, placeholder).
// Every picture box is a straight rectangle; the Direction (styles/directions/
// biba.css) styles them through tokens.

import { formatPKR, isSample } from './pieces.js';

/** Tagged template: joins arrays, drops null/undefined/false. Values are not escaped. */
export function html(strings, ...values) {
  const flat = (v) => (Array.isArray(v) ? v.map(flat).join('') : v == null || v === false ? '' : String(v));
  return strings.reduce((out, s, i) => out + s + (i < values.length ? flat(values[i]) : ''), '');
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for HTML content or a quoted attribute. The only escaper: use it everywhere. */
export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

/** Two-digit number for numbered lists and counters: 1 -> "01". */
export const pad2 = (n) => String(n).padStart(2, '0');

const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------- Media ---------- */

/** Media box with a fixed ratio: 'portrait' (2:3), 'card' (4:5), 'landscape' (3:2), 'wide' (16:7), 'square'. */
export function media(imgHtml, { ratio = 'portrait', cls = '' } = {}) {
  return `<div class="${cx('s-media', ratio && `s-media--${ratio}`, cls)}">${imgHtml}</div>`;
}

/** A figure around media, with an optional caption. Always a plain rectangle. */
export function frame(inner, { wide = false, caption = '', cls = '' } = {}) {
  return html`<figure class="${cx('s-frame', wide && 's-frame--wide', cls)}">
    ${inner}
    ${caption && `<figcaption class="s-caption">${caption}</figcaption>`}
  </figure>`;
}

/* ---------- Components ---------- */

// A 1×1 transparent GIF: what a touch screen (no hover) gets instead of the hover close-up.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Piece card: a straight 4:5 picture box, then the name and price. Hover shows the detail
 *  image; a touch screen never requests it (the <picture> swaps in a blank for hover: none).
 *  A sold-out Piece carries the "Sold out" tag on its picture and "Sold out" in place of its
 *  price (never a strike-through); a stand-in Piece a quiet "Sample design" tag. */
export function pieceCard(piece, ctx, { cls = '', eager = false, ratio = 'card' } = {}) {
  const price = piece.soldOut
    ? '<p class="piece-card__price piece-card__price--sold s-price">Sold out</p>'
    : `<p class="piece-card__price s-price">${formatPKR(piece.price)}</p>`;
  return html`<a class="${cx('piece-card s-card', piece.soldOut && 'is-sold-out', cls)}" href="${ctx.href({ page: 'piece', piece: piece.key })}">
    <div class="s-media s-media--${ratio} piece-card__media">
      ${ctx.pieceImg(piece, 'front', { loading: eager ? 'eager' : 'lazy' })}
      <picture class="piece-card__alt"><source media="(hover: none)" srcset="${BLANK}">${ctx.pieceImg(piece, 'detail', { alt: '' })}</picture>
      ${piece.soldOut && '<span class="piece-card__flag">Sold out</span>'}
    </div>
    <div class="piece-card__text">
      <p class="piece-card__name s-title">${piece.name}</p>
      ${price}
      ${isSample(piece) && sampleTag()}
    </div>
  </a>`;
}

/** The quiet "Sample design" tag for a stand-in Piece (piece card and Piece page). */
export function sampleTag(cls = '') {
  return `<span class="${cx('sample-tag', cls)}">Sample design</span>`;
}

/* ---------- How it's made ---------- */

// The three "how it's made" steps, shown on Home and Our Story as video stills
// (make-1..3, portrait, hands only) until the founder's sewing clips are in.
export const MAKING = [
  { image: 'make-1', title: 'Hand-painting the print', alt: 'Hands painting a floral print in watercolour' },
  { image: 'make-2', title: 'Cutting', alt: 'Hands cutting pink gingham cotton on the table' },
  { image: 'make-3', title: 'Sewing', alt: 'Hands guiding cotton through a sewing machine' },
];

/** One step's video still: the photo in a portrait box with a "Video soon" label. No play
 *  button and no hover effect: a still that can't play doesn't pretend to (round 3). */
export function videoStill(ctx, step, { cls = '' } = {}) {
  return html`<div class="${cx('s-media s-media--portrait video-still', cls)}">
    ${ctx.img(step.image, { alt: step.alt })}
    <span class="video-still__soon">Video soon</span>
  </div>`;
}

/* ---------- Motifs ---------- */

// Small hand-painted motifs in the style of her Prints (assets/motifs/, transparent WebP).
// Use them sparingly: the footer, the end of a section head, an empty bag, a confirmation.
export const MOTIFS = ['bow', 'sprig', 'star', 'daisy'];

/** A decorative motif image: motif('sprig'), motif('bow', 'my-class'). Sized by CSS (.motif). */
export function motif(name, cls = '') {
  if (!MOTIFS.includes(name)) return '';
  return `<img class="${cx('motif', `motif--${name}`, cls)}" src="assets/motifs/${name}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
}

/** Section heading block used across Pages. `motif` (a MOTIFS name) sits small at the end of the title. */
export function sectionHead({ eyebrow = '', title = '', link = '', center = false, motif: m = '', cls = '' }) {
  return html`<header class="${cx('sec-head', center && 'sec-head--center', cls)}">
    <div class="sec-head__titles">
      ${eyebrow && `<p class="s-eyebrow">${eyebrow}</p>`}
      <h2 class="s-display s-display--m">${title}${m && motif(m, 'sec-head__motif')}</h2>
    </div>
    ${link}
  </header>`;
}

/** "Coming with ticket NN" page shown for a Page whose Layout is not built yet. */
export function placeholder(ctx, { page, ticket }) {
  return html`<section class="placeholder s-field">
    <div class="placeholder__inner">
      <p class="s-eyebrow">${page}</p>
      <h1 class="s-display s-display--l">Coming soon</h1>
      <p class="s-lede">This Page is still being made. It arrives with ticket ${ticket}.</p>
      <a class="s-link" href="${ctx.href({ page: 'home' })}">Return home</a>
    </div>
  </section>`;
}
