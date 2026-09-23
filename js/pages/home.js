// Home, round 2: one Layout. The Cover banner (the client's pick, Banner 2 in
// round 1) in the Biba Direction, then the brand line, the six Pieces in rows
// of two, a "how it's made" strip, the facts strip and the small footer.
//
// The Cover is a deck of slides: the four Cover photographs first (home-1..4,
// each captioned with the Pieces it shows), then one slide per Piece (its front
// photo, with the detail beside it on Desktop). A tap or click anywhere on the
// photograph, or the "Tap to see more" button, wipes to the next; the arrow
// keys step both ways. No autoplay. Reduced motion turns the wipe into a short
// fade (styles/pages/home.css).
// Each Layout: { name, render(ctx) => html, header?: 'overlay', mount? }

import { html, esc, pad2, pieceCard, videoStill, MAKING } from '../ui.js';
import { FABRIC, DISPATCH, DELIVERY, EXCHANGES, sizeRange } from '../pieces.js';

// Placeholder collection title and line (spec: Copy).
const TITLE = 'Easy, <em>breezy</em> cotton';
const SUB = 'Short kurtas with farshi or slim shalwar, in hand-painted Prints.';

/* ---------- The Cover banner ---------- */

// The Cover photographs and the Pieces each one shows. Every one has open sky
// or wall above the model, so her face sits below the overlay header. home-2..4
// frame her lower in the picture, so they crop from the foot (position) to lift
// her face clear of the title on Desktop.
const COVERS = [
  { image: 'home-1', pieces: ['posy'], alt: 'A short kurta and farshi shalwar on a sunny rooftop' },
  { image: 'home-2', pieces: ['buttercup'], alt: 'A short kurta and slim shalwar against a white wall', position: '50% 100%' },
  { image: 'home-3', pieces: ['pistachio', 'lilac'], alt: 'Two friends in short kurtas and shalwar on a garden path', position: '50% 100%' },
  { image: 'home-4', pieces: ['posy'], alt: 'A short kurta and farshi shalwar on white steps', position: '50% 100%' },
];

// One entry per slide: what the caption names and where its link goes.
function coverSlides(ctx) {
  const byKey = (key) => ctx.pieces.find((p) => p.key === key);
  return [
    ...COVERS.map((c) => {
      const shown = c.pieces.map(byKey).filter(Boolean);
      const one = shown.length === 1 ? shown[0] : null;
      return {
        cover: c,
        name: shown.map((p) => p.name).join(' and '),
        href: one ? ctx.href({ page: 'piece', piece: one.key }) : ctx.href({ page: 'collection' }),
        sold: shown.some((p) => p.soldOut),
      };
    }),
    ...ctx.pieces.map((p) => ({ piece: p, name: p.name, href: ctx.href({ page: 'piece', piece: p.key }), sold: p.soldOut })),
  ];
}

function slide(ctx, s, i, total) {
  const current = i === 0;
  const attrs = `class="home-l1__slide${s.cover ? ' home-l1__slide--cover' : ''}${current ? ' is-current' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${total}: ${esc(s.name)}" data-name="${esc(s.name)}" data-href="${s.href}"${s.sold ? ' data-sold' : ''}${current ? '' : ' aria-hidden="true"'}`;
  const loading = current ? 'eager' : 'lazy';
  if (s.cover) {
    return `<div ${attrs}><div class="s-media home-l1__panel">${ctx.img(s.cover.image, { alt: s.cover.alt, position: s.cover.position, loading })}</div></div>`;
  }
  return `<div ${attrs}>
      <div class="s-media home-l1__panel">${ctx.pieceImg(s.piece, 'front', { loading })}</div>
      <div class="s-media home-l1__panel home-l1__panel--detail">${ctx.pieceImg(s.piece, 'detail', { loading: 'lazy' })}</div>
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
        <p class="home-l1__now" aria-live="polite">
          <span class="home-l1__dots" aria-hidden="true">${slides.map((_, i) => `<span${i === 0 ? ' class="is-on"' : ''}></span>`)}</span>
          <span class="home-l1__count" data-cover-count>${pad2(1)} / ${pad2(slides.length)}</span>
          <a class="home-l1__name" data-cover-name href="${first.href}">${esc(first.name)}</a>
          <span class="home-l1__sold" data-cover-sold${first.sold ? '' : ' hidden'}>Sold out</span>
        </p>
        <button class="home-l1__next" type="button" data-cover-next>
          <span class="home-l1__hint home-l1__hint--tap">Tap to see more</span><span class="home-l1__hint home-l1__hint--click">Click to see more</span>
          <span class="home-l1__arrow" aria-hidden="true"></span>
        </button>
      </div>
      <h1 class="home-l1__title">${TITLE}</h1>
      <div class="home-l1__row">
        <p class="home-l1__sub">${SUB}</p>
        <a class="s-btn home-l1__btn" href="${ctx.href({ page: 'collection' })}">Shop now</a>
      </div>
    </div>
  </section>`;
}

/** Wire the Cover: tap or click to wipe to the next slide, arrow keys both ways. */
function mountCover(root) {
  const cover = root.querySelector('.home-l1__cover');
  if (!cover) return null;
  const slides = [...cover.querySelectorAll('.home-l1__slide')];
  const dots = [...cover.querySelectorAll('.home-l1__dots > span')];
  const count = cover.querySelector('[data-cover-count]');
  const name = cover.querySelector('[data-cover-name]');
  const sold = cover.querySelector('[data-cover-sold]');
  let cur = 0;
  let timer = 0;

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
    count.textContent = `${pad2(cur + 1)} / ${pad2(slides.length)}`;
    name.textContent = into.dataset.name;
    name.setAttribute('href', into.dataset.href);
    sold.hidden = !('sold' in into.dataset);
    timer = setTimeout(settle, 1400); // backstop if animationend never fires
  };

  const onEnd = (e) => {
    if (e.target.classList?.contains('is-entering')) settle();
  };
  const onClick = (e) => {
    if (e.target.closest('a')) return; // the Shop button and the Piece name keep their links
    show(cur + 1);
  };
  const onKey = (e) => {
    if (e.target.closest('a') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === 'ArrowLeft') show(cur - 1, -1);
    else return;
    e.preventDefault();
  };

  cover.addEventListener('click', onClick);
  cover.addEventListener('keydown', onKey);
  cover.addEventListener('animationend', onEnd);
  return () => {
    clearTimeout(timer);
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
        <header class="home-l1__drop-head">
          <h2 class="s-display s-display--m">${ctx.drop.name}</h2>
          <a class="s-link" href="${ctx.href({ page: 'collection' })}">View all</a>
        </header>
        <div class="home-l1__drop-grid">
          ${pieces.map((p, i) => pieceCard(p, ctx, { eager: i < 2 }))}
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
          <p class="s-body home-l1__made-intro">Every Print starts as a painting by our founder. Each Piece is then cut and sewn in small runs in Pakistan.</p>
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
        <li><p class="s-eyebrow">Two-piece</p><p class="s-meta">Short kurta and shalwar in ${FABRIC.kurta.toLowerCase()}. Add the matching ${FABRIC.dupatta.toLowerCase()} dupatta if you like.</p></li>
        <li><p class="s-eyebrow">Sizes ${sizeRange()}</p><p class="s-meta">See the size chart on every Piece. ${EXCHANGES.short}.</p></li>
        <li><p class="s-eyebrow">Dispatch in ${DISPATCH.days}</p><p class="s-meta">${DELIVERY.text}</p></li>
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
