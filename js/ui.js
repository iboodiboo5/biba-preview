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

/** Media box with a fixed ratio: 'portrait' (2:3), 'landscape' (3:2), 'wide' (16:7), 'square'. */
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

/** Piece card: a straight picture box, then the name and price. Hover shows the detail image.
 *  A sold-out Piece carries a "Sold out" flag on its picture; a stand-in Piece a quiet
 *  "Sample design" tag under its name. */
export function pieceCard(piece, ctx, { cls = '', eager = false, ratio = 'portrait' } = {}) {
  return html`<a class="${cx('piece-card s-card', piece.soldOut && 'is-sold-out', cls)}" href="${ctx.href({ page: 'piece', piece: piece.key })}">
    <div class="s-media s-media--${ratio} piece-card__media">
      ${ctx.pieceImg(piece, 'front', { loading: eager ? 'eager' : 'lazy' })}
      ${ctx.pieceImg(piece, 'detail', { cls: 'piece-card__alt', alt: '' })}
      ${piece.soldOut && '<span class="piece-card__flag">Sold out</span>'}
    </div>
    <div class="piece-card__text">
      <p class="piece-card__name s-title">${piece.name}</p>
      <p class="piece-card__price s-price">${formatPKR(piece.price)}</p>
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
  { image: 'make-1', title: 'Hand-painting the Print', alt: 'Hands painting a floral Print in watercolour' },
  { image: 'make-2', title: 'Cutting', alt: 'Hands cutting pink gingham cotton on the table' },
  { image: 'make-3', title: 'Sewing', alt: 'Hands guiding cotton through a sewing machine' },
];

/** One step's video still: the photo in a portrait box, a play button and a "Video soon" label. */
export function videoStill(ctx, step, { cls = '' } = {}) {
  return html`<div class="${cx('s-media s-media--portrait video-still', cls)}">
    ${ctx.img(step.image, { alt: step.alt })}
    <span class="video-still__play" aria-hidden="true"></span>
    <span class="video-still__soon">Video soon</span>
  </div>`;
}

/** Section heading block used across Pages. */
export function sectionHead({ eyebrow = '', title = '', link = '', center = false, cls = '' }) {
  return html`<header class="${cx('sec-head', center && 'sec-head--center', cls)}">
    <div class="sec-head__titles">
      ${eyebrow && `<p class="s-eyebrow">${eyebrow}</p>`}
      <h2 class="s-display s-display--m">${title}</h2>
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
