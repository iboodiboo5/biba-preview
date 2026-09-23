// Collection: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.

import { html, pieceCard } from '../ui.js';

/* ---------- Layout 1 · Grid: a title, a filter bar, the six pieces in straight boxes ---------- */

const grid = {
  name: 'Grid',
  render(ctx) {
    const { drop, pieces } = ctx;
    return html`
      <section class="collection-l1__intro">
        <div class="wrap collection-l1__intro-grid">
          <div class="collection-l1__titles">
            <h1 class="s-display s-display--xl collection-l1__title">The collection</h1>
          </div>
          <p class="s-lede collection-l1__lede">${drop.intro}</p>
        </div>
      </section>

      <div class="collection-l1__bar">
        <div class="wrap collection-l1__bar-inner">
          <div class="collection-l1__filters" role="group" aria-label="Filter by shalwar">
            <button type="button" class="collection-l1__filter" data-filter="all" aria-pressed="true">All <span class="collection-l1__count">${pieces.length}</span></button>
            <button type="button" class="collection-l1__filter" data-filter="farshi" aria-pressed="false">Farshi<span class="collection-l1__wide"> shalwar</span></button>
            <button type="button" class="collection-l1__filter" data-filter="slim" aria-pressed="false">Slim<span class="collection-l1__wide"> shalwar</span></button>
          </div>
        </div>
      </div>

      <section class="collection-l1__field">
        <div class="wrap">
          <div class="collection-l1__grid">
            ${pieces.map(
              (p, i) => html`<div class="collection-l1__cell${p.soldOut ? ' is-sold-out' : ''}" data-trouser="${p.trouser}">
                ${pieceCard(p, ctx, { eager: i < 3 })}
              </div>`,
            )}
          </div>
          <p class="collection-l1__empty s-meta" hidden>No pieces in this style yet.</p>
          <p class="collection-l1__note s-meta">Design names and prices are placeholders for now, and pieces marked "Sample design" show sample print ideas until the next designs are ready.</p>
        </div>
      </section>
    `;
  },
  mount(el) {
    const cells = [...el.querySelectorAll('.collection-l1__cell')];
    const buttons = [...el.querySelectorAll('[data-filter]')];
    const empty = el.querySelector('.collection-l1__empty');
    let filter = 'all';

    const apply = () => {
      cells.forEach((c) => (c.hidden = filter !== 'all' && c.dataset.trouser !== filter));
      empty.hidden = cells.some((c) => !c.hidden);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    };
    const onClick = (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      filter = b.dataset.filter;
      apply();
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  },
};

export const layouts = [grid];
