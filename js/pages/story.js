// Our Story: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.
//
// Every fact here comes from the client's own words (docs/client/round-2/
// client-reply.md): fashion design at London College of Fashion, Prints
// hand-painted by her, intentionally designed, pure cotton, made in Pakistan,
// sewing videos, for ambitious young women who work or study in Pakistan.
// She is "our founder": no name, no portrait. The brand has no handles yet, so
// Follow along says "Instagram soon", as the footer does.
//
// Round 3 (ticket 06): no facts table (the facts live on Home, the Piece page
// and Help), fewer small labels, a shop button after the founder, and the two
// real print swatches drawn from her full-resolution artwork (PRINT_ART below).
//
// Images (ticket 03): story-1 the Prints on the worktable, story-2 the rail
// (hands only), story-3 two friends out and about, all landscape 3:2. The
// "how it's made" steps and their video stills are shared with Home (ui.js).

import { html, esc, frame, media, pad2, videoStill, MAKING } from '../ui.js';

// Her two real prints at full resolution (cut from docs/client/round-2/
// from-client/), sharper than the 600px piece squares. Shared-file note for
// ticket 07: this belongs in js/images.js as a resolver kind; until then the
// fallback is the piece's own square, so nothing 404s.
const PRINT_ART = {
  posy: 'assets/prints/print-posy.jpg',
  buttercup: 'assets/prints/print-buttercup.jpg',
};

/* ---------- Layout 1 · Our founder: short sections, one idea each ---------- */

const founder = {
  name: 'Our founder',
  render(ctx) {
    const { brand, pieces } = ctx;
    const prints = pieces.filter((p) => p.real);
    const still = (key, alt, ratio, loading = 'lazy') =>
      media(ctx.img(key, { alt, loading }), { ratio });
    const printArt = (p) => {
      const alt = `The ${p.name} print, hand-painted`;
      const src = PRINT_ART[p.key];
      if (!src) return ctx.pieceImg(p, 'print', { alt });
      const { src: fallback } = ctx.pieceSrc(p, 'print');
      return `<img src="${src}" data-fallback="${esc(fallback)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
    };

    return html`
      <section class="story-l1__intro">
        <div class="wrap story-l1__intro-inner">
          <p class="s-eyebrow">Our story</p>
          <h1 class="s-display s-display--xl story-l1__title">Fun, fresh and <em>easy breezy</em></h1>
          <p class="s-lede story-l1__lede">${brand.name} makes really well-made clothes in pure cotton, designed intentionally and made in Pakistan.</p>
        </div>
        <div class="wrap">
          ${frame(still('story-1', 'Hand-painted prints on the worktable', 'wide', 'eager'), { cls: 'story-l1__hero' })}
        </div>
      </section>

      <section class="story-l1__split">
        <div class="wrap story-l1__split-grid">
          ${frame(still('story-2', 'Finished pieces on the rail', 'landscape', 'eager'), { cls: 'story-l1__split-media' })}
          <div class="story-l1__split-text">
            <h2 class="s-display s-display--l">Studied fashion in London</h2>
            <p class="s-body">Our founder has a degree in fashion design from London College of Fashion. She designs every piece intentionally: the shape, the print and how it is made.</p>
            <a class="s-btn" href="${ctx.href({ page: 'collection' })}">Shop the collection</a>
          </div>
        </div>
      </section>

      <section class="story-l1__split story-l1__split--flip">
        <div class="wrap story-l1__split-grid">
          <div class="story-l1__prints">
            ${prints.map((p) =>
              frame(media(printArt(p), { ratio: 'portrait' }), {
                caption: p.groundLabel,
              }),
            )}
          </div>
          <div class="story-l1__split-text">
            <p class="s-eyebrow">The prints</p>
            <h2 class="s-display s-display--l">Painted by hand</h2>
            <p class="s-body">Our founder hand-paints the prints herself: pastel gingham, florals and the odd bow. Each one becomes a short kurta and shalwar in pure cotton.</p>
          </div>
        </div>
      </section>

      <section class="story-l1__making s-field s-field--gingham">
        <div class="wrap">
          <div class="story-l1__making-head">
            <p class="s-eyebrow">Watch us make it</p>
            <h2 class="s-display s-display--l">Sewing is at the heart of it</h2>
            <p class="s-body">Our founder has been making sewing videos for a few years. Here she will show how each piece is painted, cut and sewn.</p>
          </div>
          <ol class="story-l1__reels">
            ${MAKING.map(
              (m, i) => html`<li class="story-l1__reel">
                ${videoStill(ctx, m, { cls: 'story-l1__still' })}
                <p class="story-l1__reel-title"><span class="s-meta">${pad2(i + 1)}</span> ${m.title}</p>
              </li>`,
            )}
          </ol>
        </div>
      </section>

      <section class="story-l1__for">
        <div class="wrap story-l1__for-grid">
          ${frame(still('story-3', 'Two friends out in short kurtas and shalwar', 'landscape'), { cls: 'story-l1__for-media' })}
          <div class="story-l1__for-text">
            <h2 class="s-display s-display--l">For ambitious young women</h2>
            <p class="s-body">Women who work or study in Pakistan and want clothes that are easy to wear, fun and really well made.</p>
            <p class="s-body">Made in Pakistan in small numbers. When a design sells out, it is sold out.</p>
          </div>
        </div>
      </section>

      <section class="story-l1__follow s-field s-field--soft">
        <div class="wrap story-l1__follow-inner">
          <h2 class="s-display s-display--m">Come and say hello</h2>
          <p class="story-l1__social"><span class="story-l1__social-name">Instagram</span> <span class="s-meta">soon</span></p>
          <a class="s-btn" href="${ctx.href({ page: 'collection' })}">Shop the collection</a>
        </div>
      </section>
    `;
  },
};

export const layouts = [founder];
