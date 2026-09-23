// Collection: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.

import { html, pieceCard } from '../ui.js';
import { DISPATCH, EXCHANGES, sizeRange } from '../pieces.js';

/* ---------- Layout 1 · Grid: a title, a filter bar, the six Pieces in straight boxes ---------- */

const grid = {
  name: 'Grid',
  render(ctx) {
    const { drop, pieces } = ctx;
    const facts = [
      ['Sizes', `${sizeRange()}, no custom sizing`, ctx.href({ page: 'help' }), 'Size chart'],
      ['Dispatch', DISPATCH.days],
      ['Delivery', 'Calculated at checkout'],
      ['Exchanges', EXCHANGES.short],
    ];

    return html`
      <section class="collection-l1__intro">
        <div class="wrap collection-l1__intro-grid">
          <div class="collection-l1__titles">
            <p class="s-eyebrow">${drop.name}</p>
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
          <label class="collection-l1__sort">
            <span class="collection-l1__wide">Sort by</span>
            <select data-sort aria-label="Sort">
              <option value="drop">Featured</option>
              <option value="asc">Price, low to high</option>
              <option value="desc">Price, high to low</option>
            </select>
          </label>
        </div>
      </div>

      <section class="collection-l1__field">
        <div class="wrap">
          <div class="collection-l1__grid">
            ${pieces.map(
              (p, i) => html`<div class="collection-l1__cell${p.soldOut ? ' is-sold-out' : ''}" data-trouser="${p.trouser}" data-price="${p.price}" data-order="${i}">
                ${pieceCard(p, ctx, { eager: i < 3 })}
              </div>`,
            )}
          </div>
          <p class="collection-l1__empty s-meta" hidden>No Pieces in this style yet.</p>
          <p class="collection-l1__note s-meta">Design names and prices are placeholders for now. Pieces marked "Sample design" show sample Print ideas until the next designs are ready.</p>
        </div>
      </section>

      <section class="collection-l1__facts s-field s-field--soft">
        <div class="wrap">
          <ul class="collection-l1__facts-list">
            ${facts.map(
              ([label, text, href, linkText]) => html`<li>
                <p class="s-eyebrow">${label}</p>
                <p class="collection-l1__fact">${text}</p>
                ${href && html`<a class="s-link" href="${href}">${linkText}</a>`}
              </li>`,
            )}
          </ul>
        </div>
      </section>
    `;
  },
  mount(el) {
    const cells = [...el.querySelectorAll('.collection-l1__cell')];
    const buttons = [...el.querySelectorAll('[data-filter]')];
    const select = el.querySelector('[data-sort]');
    const empty = el.querySelector('.collection-l1__empty');
    let filter = 'all';

    const apply = () => {
      const sort = select.value;
      const ranked = [...cells].sort((a, b) => {
        if (sort === 'asc') return a.dataset.price - b.dataset.price;
        if (sort === 'desc') return b.dataset.price - a.dataset.price;
        return a.dataset.order - b.dataset.order;
      });
      ranked.forEach((c, i) => (c.style.order = i));
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
    select.addEventListener('change', apply);
    return () => {
      el.removeEventListener('click', onClick);
      select.removeEventListener('change', apply);
    };
  },
};

export const layouts = [grid];
