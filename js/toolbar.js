// Review toolbar. Lives outside #site, so no Direction style ever reaches it.
// The skeleton is built once; only the control groups and label re-render.
// #rt-actions is a persistent slot for the ♡ and Favourites controls
// (js/favourites-view.js); it is never re-rendered, so anything mounted there stays.
//
// The toolbar can be hidden (the "Hide" button, or h) to see a Page as a
// customer would. While hidden, a small "Show toolbar" pill stays in the corner.

import { href, go, label, detailLabel, FRAMES } from './state.js';
import { PAGES } from './pages.js';
import { PIECES } from './pieces.js';
import { NAMES, brandFor } from './brand.js';
import { fitDevice } from './site.js';
import { esc } from './ui.js';

const root = document.getElementById('rt');
const docEl = document.documentElement;

root.innerHTML = `
  <div class="rt-row rt-row--main">
    <div class="rt-brand"><span class="rt-brand__mark" data-rt="brand"></span><span class="rt-brand__sub">Website review</span></div>
    <nav class="rt-pages" data-rt="pages" aria-label="Page"></nav>
    <div class="rt-piece" data-rt="piece"></div>
    <div class="rt-spacer"></div>
    <div class="rt-actions" id="rt-actions"></div>
    <button class="rt-hide" type="button" data-rt="hide" title="Hide the toolbar to see the Page as a customer would (h)">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 9l8 7 8-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="rt-hide__text">Hide toolbar</span>
    </button>
  </div>
  <div class="rt-row rt-row--controls" data-rt="controls"></div>
  <div class="rt-label"><span id="rt-label"></span><span class="rt-label__extra" data-rt="extra"></span></div>
`;

const slot = (name) => root.querySelector(`[data-rt="${name}"]`);

/* ---------- Hide and show ---------- */

const showPill = document.createElement('button');
showPill.type = 'button';
showPill.className = 'rt-show';
showPill.innerHTML = 'Show toolbar <kbd>h</kbd>';
document.body.appendChild(showPill);

export function isToolbarHidden() {
  return docEl.classList.contains('rt-is-hidden');
}

export function setToolbarHidden(hidden) {
  docEl.classList.toggle('rt-is-hidden', hidden);
  showPill.hidden = !hidden;
  (hidden ? showPill : slot('hide')).focus({ preventScroll: true });
}

showPill.hidden = true;
showPill.addEventListener('click', () => setToolbarHidden(false));
slot('hide').addEventListener('click', () => setToolbarHidden(true));

/* ---------- Controls ---------- */

/** One labelled row of segmented links, e.g. Name: Biba | Anaar. */
function segmentedGroup(title, options, isActive, patchFor, cls = '') {
  return `<div class="rt-group ${cls}" role="group" aria-label="${title}">
    <span class="rt-group__title">${title}</span>
    <div class="rt-seg">${options
      .map((option) => {
        const on = isActive(option);
        return `<a class="rt-seg__opt${on ? ' is-on' : ''}" href="${href(patchFor(option))}"${
          on ? ' aria-current="true"' : ''
        }${option.title ? ` title="${esc(option.title)}"` : ''}>${option.html ?? esc(option.label)}</a>`;
      })
      .join('')}</div>
  </div>`;
}

/** The toolbar's brand follows the Name: Biba's lettering, or Anaar's mark and name. */
function brandMark(brand) {
  const logo = `<img class="rt-brand__logo rt-brand__logo--${brand.key}" src="${brand.logo.src}" alt="">`;
  return brand.wordmark ? `${logo}<span class="rt-brand__name">${esc(brand.name)}</span>` : logo;
}

export function renderToolbar(s) {
  const brand = brandFor(s.name);
  const mark = slot('brand');
  if (mark.dataset.name !== brand.key) {
    mark.dataset.name = brand.key;
    mark.innerHTML = brandMark(brand);
  }

  slot('pages').innerHTML = PAGES.map((p) => {
    const on = p.key === s.page;
    return `<a class="rt-page${on ? ' is-on' : ''}" href="${href({ page: p.key })}"${on ? ' aria-current="page"' : ''}>${esc(p.label)}</a>`;
  }).join('');

  slot('piece').innerHTML =
    s.page === 'piece'
      ? `<label class="rt-select"><span class="rt-group__title">Piece</span><select aria-label="Piece">${PIECES.map(
          (p) => `<option value="${p.key}"${p.key === s.piece ? ' selected' : ''}>${esc(p.name)}</option>`,
        ).join('')}</select></label>`
      : '';

  const names = NAMES.map((n) => ({ key: n.key, label: n.name, title: `See the site as ${n.name}` }));

  slot('controls').innerHTML = [
    segmentedGroup('Name', names, (o) => o.key === s.name, (o) => ({ name: o.key }), 'rt-group--name'),
    segmentedGroup('Frame', FRAMES, (o) => o.key === s.frame, (o) => ({ frame: o.key })),
  ].join('');

  // In the compact (scrolling) toolbar, keep the current Page and Name in view.
  for (const row of [slot('pages'), slot('controls')]) {
    const active = row.querySelector('.is-on');
    if (active && row.scrollWidth > row.clientWidth) {
      const r = active.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      if (r.left < box.left || r.right > box.right - 28) row.scrollLeft += r.right - box.right + 40;
    }
  }

  document.getElementById('rt-label').textContent = label(s);
  slot('extra').textContent = ` · ${detailLabel(s)}`;
}

root.addEventListener('change', (e) => {
  if (e.target.matches('[data-rt="piece"] select')) go({ piece: e.target.value });
});

// Keep --rt-h in step with the toolbar's real height (it wraps on narrow windows).
new ResizeObserver(() => {
  docEl.style.setProperty('--rt-h', `${root.offsetHeight}px`);
  fitDevice();
}).observe(root);
