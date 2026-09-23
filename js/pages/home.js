// Home, round 3: one Layout. The Cover banner in the Biba Direction, then the
// brand line, the six Pieces in rows of two, a "how it's made" strip, the facts
// strip and the small footer.
//
// The Cover is a deck of slides: the four Cover photographs first (home-1..4,
// each captioned with the Pieces it shows; phones get the portrait crops,
// home-N-portrait), then one slide per Piece that is not sold out (its front
// photo, with the detail beside it on Desktop). A tap or click anywhere on the
// photograph, or the "<Piece> · tap for next" button, wipes to the next; a
// sideways swipe of more than 40px goes either way on touch; the arrow keys
// step both ways. No autoplay. Reduced motion turns the wipe into a short fade
// (styles/pages/home.css).
// Each Layout: { name, render(ctx) => html, header?: 'overlay', mount? }

import { html, esc, pad2, pieceCard, sectionHead, videoStill, MAKING, PHONE_WIDTH } from '../ui.js';
import { resolve, source, webpFor } from '../images.js';
import { FABRIC, DISPATCH, DELIVERY, EXCHANGES, sizeRange } from '../pieces.js';

// Placeholder collection title and line (spec: Copy).
const TITLE = 'Easy, <em>breezy</em> cotton';
const SUB = 'Short kurtas with farshi or slim shalwar, in hand-painted prints.';

// A sideways drag longer than this (px) is a swipe.
const SWIPE = 40;

/* ---------- The Cover banner ---------- */

// The Cover photographs and the Pieces each one shows. `position` frames the
// landscape photograph on Desktop so her head clears the overlay header and the
// title sits beside her, not over her hem. `portrait` is the phone crop (4:5,
// headroom above her, the outfit in the top 60%, calm ground under it for the
// title).
const COVERS = [
  { image: 'home-1', portrait: 'home-1-portrait', pieces: ['posy'], alt: 'A short kurta and farshi shalwar on a sunny rooftop', position: '50% 22%' },
  { image: 'home-2', portrait: 'home-2-portrait', pieces: ['buttercup'], alt: 'A short kurta and slim shalwar against a white wall', position: '50% 78%' },
  { image: 'home-3', portrait: 'home-3-portrait', pieces: ['pistachio', 'lilac'], alt: 'Two friends in short kurtas and shalwar on a garden path', position: '50% 70%' },
  { image: 'home-4', portrait: 'home-4-portrait', pieces: ['posy'], alt: 'A short kurta and farshi shalwar on white steps', position: '50% 72%' },
];

// Piece slides: the photos start under the header, on a soft copy of
// themselves, so her head always clears the logo. The front photo is framed
// from the top, centred on each model (each Piece's `framing`, js/pieces.js).

// One entry per slide: what the caption names and where its link goes.
// Sold-out Pieces never appear in the rotation.
function coverSlides(ctx) {
  const byKey = (key) => ctx.pieces.find((p) => p.key === key);
  return [
    ...COVERS.map((c) => {
      const shown = c.pieces.map(byKey).filter((p) => p && !p.soldOut);
      const one = shown.length === 1 ? shown[0] : null;
      return {
        cover: c,
        name: shown.map((p) => p.name).join(' and '),
        href: one ? ctx.href({ page: 'piece', piece: one.key }) : ctx.href({ page: 'collection' }),
        sold: shown.length === 0,
      };
    }),
    ...ctx.pieces.map((p) => ({ piece: p, name: p.name, href: ctx.href({ page: 'piece', piece: p.key }), sold: p.soldOut })),
  ].filter((s) => !s.sold);
}

// A Cover photograph: the landscape file, with the portrait crop's WebPs for
// phones when it exists. mountCover switches the <source> on in the Phone frame.
// A waiting slide's <source> waits with its <img> (js/images.js), so only the
// first slide loads. The first slide's image is the one the first screen waits
// on: it is fetched first, over a blurred low-resolution copy (desktop only).
function coverPicture(ctx, c, first) {
  const loading = first ? 'eager' : 'lazy';
  const land = ctx.img(c.image, { alt: c.alt, position: c.position, loading, priority: first ? 'high' : '' });
  const port = c.portrait ? source(c.portrait, `(max-width: ${PHONE_WIDTH}px)`) : '';
  if (!port) return land;
  return `<picture>${port.replace('<source ', '<source data-cover-portrait ')}${land}</picture>`;
}

/** The blurred stand-in under the first Cover photograph while it loads (desktop). */
function coverPlaceholder(c) {
  const small = webpFor(resolve(c.image).src);
  // Absolute, because a url() inside a custom property resolves against the stylesheet that uses it.
  return `--home-l1-ph: url('${new URL(small, document.baseURI).href}');`;
}

function slide(ctx, s, i, total) {
  const current = i === 0;
  const kind = s.cover ? 'cover' : 'piece';
  const attrs = `class="home-l1__slide home-l1__slide--${kind}${current ? ' is-current' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${total}: ${esc(s.name)}" data-name="${esc(s.name)}" data-href="${s.href}"${current ? '' : ' aria-hidden="true"'}`;
  const loading = current ? 'eager' : 'lazy';
  if (s.cover) {
    const ph = current ? ` style="${coverPlaceholder(s.cover)}"` : '';
    return `<div ${attrs}><div class="s-media home-l1__panel${current ? ' home-l1__panel--first' : ''}"${ph}>${coverPicture(ctx, s.cover, current)}</div></div>`;
  }
  const soft = (k) => ctx.pieceImg(s.piece, k, { alt: '', cls: 'home-l1__soft', loading: 'lazy' });
  return `<div ${attrs}>
      <div class="s-media home-l1__panel home-l1__panel--front">${soft('front')}${ctx.pieceImg(s.piece, 'front', { loading, position: s.piece.framing })}</div>
      <div class="s-media home-l1__panel home-l1__panel--detail">${soft('detail')}${ctx.pieceImg(s.piece, 'detail', { loading: 'lazy' })}</div>
    </div>`;
}

function coverBanner(ctx) {
  const slides = coverSlides(ctx);
  const first = slides[0];
  return html`
  <section class="home-l1__cover" aria-roledescription="carousel" aria-label="Designs">
    <div class="home-l1__slides">
      ${slides.map((s, i) => slide(ctx, s, i, slides.length))}
    </div>
    <div class="home-l1__scrim" aria-hidden="true"></div>
    <div class="wrap home-l1__text">
      <div class="home-l1__meta">
        <span class="home-l1__dots" aria-hidden="true">${slides.map((_, i) => `<span${i === 0 ? ' class="is-on"' : ''}></span>`)}</span>
        <button class="home-l1__next" type="button" data-cover-next>
          <span class="home-l1__label" data-cover-label aria-live="polite">${esc(first.name)}</span><span class="home-l1__hint home-l1__hint--tap">&nbsp;· tap for next</span><span class="home-l1__hint home-l1__hint--click">&nbsp;· click for next</span>
          <span class="home-l1__arrow" aria-hidden="true"></span>
        </button>
      </div>
      <h1 class="home-l1__title">${TITLE}</h1>
      <div class="home-l1__row">
        <p class="home-l1__sub">${SUB}</p>
        <a class="s-btn home-l1__btn" data-cover-shop href="${first.href}">Shop <span data-cover-name>${esc(first.name)}</span> <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </section>`;
}

/** Wire the Cover: tap, click or swipe to wipe to the next slide, arrow keys both ways. */
function mountCover(root) {
  const cover = root.querySelector('.home-l1__cover');
  if (!cover) return null;
  const slides = [...cover.querySelectorAll('.home-l1__slide')];
  const dots = [...cover.querySelectorAll('.home-l1__dots > span')];
  const label = cover.querySelector('[data-cover-label]');
  const name = cover.querySelector('[data-cover-name]');
  const shop = cover.querySelector('[data-cover-shop]');
  const portraits = [...cover.querySelectorAll('[data-cover-portrait]')];
  let cur = 0;
  let timer = 0;

  // The Phone frame draws the site at 390px inside a wide window, where the
  // <source> media query (which reads the window) would pick the landscape
  // file: follow the banner's own width instead.
  const fit = () => {
    const media = cover.clientWidth <= PHONE_WIDTH ? 'all' : `(max-width: ${PHONE_WIDTH}px)`;
    for (const s of portraits) if (s.media !== media) s.media = media;
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(cover);

  // Settle any transition still playing: the entering slide is simply current.
  const settle = () => {
    clearTimeout(timer);
    for (const s of slides) s.classList.remove('is-entering', 'is-leaving');
  };

  const show = (to, dir = 1) => {
    const next = (to + slides.length) % slides.length;
    if (next === cur) return;
    settle();
    const from = slides[cur];
    const into = slides[next];
    from.classList.remove('is-current');
    from.classList.add('is-leaving');
    from.setAttribute('aria-hidden', 'true');
    into.classList.add('is-current', 'is-entering');
    cover.classList.toggle('is-back', dir < 0);
    into.removeAttribute('aria-hidden');
    into.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
    cur = next;

    dots.forEach((d, i) => d.classList.toggle('is-on', i === cur));
    label.textContent = into.dataset.name;
    name.textContent = into.dataset.name;
    shop.setAttribute('href', into.dataset.href);
    timer = setTimeout(settle, 1400); // backstop if animationend never fires
  };

  // Swipe: a sideways drag longer than SWIPE steps the deck either way; the
  // click some browsers still send after it is swallowed.
  let start = null;
  let swipedAt = 0;
  const onTouchStart = (e) => {
    const t = e.touches[0];
    start = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    start = null;
    if (Math.abs(dx) <= SWIPE || Math.abs(dx) <= Math.abs(dy)) return;
    swipedAt = Date.now();
    if (dx < 0) show(cur + 1);
    else show(cur - 1, -1);
  };

  const onEnd = (e) => {
    if (e.target.classList?.contains('is-entering')) settle();
  };
  const onClick = (e) => {
    if (Date.now() - swipedAt < 600) return;
    if (e.target.closest('a')) return; // the Shop button keeps its link
    show(cur + 1);
  };
  const onKey = (e) => {
    if (e.target.closest('a') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1, -1);
    else return;
    e.preventDefault();
  };

  cover.addEventListener('touchstart', onTouchStart, { passive: true });
  cover.addEventListener('touchend', onTouchEnd);
  cover.addEventListener('click', onClick);
  cover.addEventListener('keydown', onKey);
  cover.addEventListener('animationend', onEnd);
  return () => {
    clearTimeout(timer);
    ro.disconnect();
    cover.removeEventListener('touchstart', onTouchStart);
    cover.removeEventListener('touchend', onTouchEnd);
    cover.removeEventListener('click', onClick);
    cover.removeEventListener('keydown', onKey);
    cover.removeEventListener('animationend', onEnd);
  };
}

/* ---------- The page under the banner ---------- */

function body(ctx) {
  const { pieces, brand } = ctx;
  return html`
    <section class="home-l1__line">
      <div class="wrap wrap--narrow">
        <p class="s-display s-display--m home-l1__line-text">${brand.line}</p>
      </div>
    </section>

    <section class="home-l1__drop">
      <div class="wrap">
        ${sectionHead({
          title: ctx.drop.name,
          link: `<a class="s-link" href="${ctx.href({ page: 'collection' })}">View all</a>`,
          motif: 'daisy',
          cls: 'home-l1__drop-head',
        })}
        <div class="home-l1__drop-grid">
          ${pieces.map((p) => pieceCard(p, ctx))}
        </div>
      </div>
    </section>

    <section class="home-l1__made s-field">
      <div class="wrap">
        <header class="home-l1__made-head">
          <div>
            <p class="s-eyebrow">How it's made</p>
            <h2 class="s-display s-display--m">Painted, cut and sewn</h2>
          </div>
          <p class="s-body home-l1__made-intro">Every print starts as a painting by our founder. Each piece is then cut and sewn in small runs in Pakistan.</p>
        </header>
        <ol class="home-l1__tiles">
          ${MAKING.map(
            (m, i) => html`<li class="home-l1__tile">
              ${videoStill(ctx, m, { cls: 'home-l1__still' })}
              <p class="home-l1__step"><span class="home-l1__num">${pad2(i + 1)}</span>${m.title}</p>
            </li>`,
          )}
        </ol>
        <a class="s-link home-l1__more" href="${ctx.href({ page: 'story' })}">Our story</a>
      </div>
    </section>

    <section class="home-l1__facts">
      <ul class="wrap home-l1__facts-list">
        <li><p class="home-l1__fact">${FABRIC.kurta} two-piece</p><p class="s-meta">A short kurta and shalwar. The matching ${FABRIC.dupatta.toLowerCase()} dupatta is optional.</p></li>
        <li><p class="home-l1__fact">Sizes ${sizeRange()}</p><p class="s-meta">${EXCHANGES.short}.</p></li>
        <li><p class="home-l1__fact">Dispatched in ${DISPATCH.days}</p><p class="s-meta">${DELIVERY.text}</p></li>
      </ul>
    </section>
  `;
}

const cover = {
  name: 'Cover',
  header: 'overlay',
  render: (ctx) => coverBanner(ctx) + body(ctx),
  mount: (el) => mountCover(el),
};

export const layouts = [cover];
