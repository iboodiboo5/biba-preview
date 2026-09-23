// Review toolbar. Lives outside #site, so no Direction style ever reaches it.
// The skeleton is built once; only the control groups and label re-render.
// #rt-actions is a persistent slot for the ♡ and Favourites controls
// (js/favourites-view.js); it is never re-rendered, so anything mounted there stays.
//
// The toolbar can be hidden (the "Hide" button, or h) to see a Page as a
// customer would. While hidden, a small "Show toolbar" pill stays in the corner
// (on touch screens a 44px round button at the bottom left).
//
// On a real phone (under 600px, see isNarrow() in state.js) the toolbar is one
// row of 44px controls: logo, a Page dropdown that also picks the Piece, Name,
// ♡ and Favourites, Hide. The Frame is native there and reads "Phone (actual
// size)"; it can't be switched to Desktop. Touch screens get no key hints.

import { href, go, label, liveDetailLabel, isNarrow, NATIVE_FRAME_LABEL, FRAMES } from './state.js';
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
    <label class="rt-pagesel"><span class="rt-visually-hidden">Page</span><select data-rt="pagesel"></select></label>
    <nav class="rt-pages" data-rt="pages" aria-label="Page"></nav>
    <div class="rt-piece" data-rt="piece"></div>
    <div class="rt-spacer"></div>
    <div class="rt-actions" id="rt-actions"></div>
    <button class="rt-hide" type="button" data-rt="hide">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9l8 7 8-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
showPill.setAttribute('aria-label', 'Show toolbar');
showPill.innerHTML = `<svg class="rt-show__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 15l8-7 8 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="rt-show__text">Show toolbar</span><kbd>h</kbd>`;
document.body.appendChild(showPill);

// Touch screens have no keyboard: no key hints in titles (the CSS hides <kbd>s).
const touchMedia = matchMedia('(hover: none)');
function keyHints() {
  slot('hide').title = touchMedia.matches
    ? 'Hide the toolbar to see the Page as a customer would'
    : 'Hide the toolbar to see the Page as a customer would (h)';
}
keyHints();
touchMedia.addEventListener('change', keyHints);

export function isToolbarHidden() {
  return docEl.classList.contains('rt-is-hidden');
}

/** `focus` moves focus to the control that undoes it: for the keyboard (h, Enter),
 *  not for a tap, which would leave a focus ring on the pill. */
export function setToolbarHidden(hidden, { focus = true } = {}) {
  docEl.classList.toggle('rt-is-hidden', hidden);
  showPill.hidden = !hidden;
  if (focus) (hidden ? showPill : slot('hide')).focus({ preventScroll: true });
}

showPill.hidden = true;
// e.detail is 0 when a button is pressed from the keyboard.
showPill.addEventListener('click', (e) => setToolbarHidden(false, { focus: e.detail === 0 }));
slot('hide').addEventListener('click', (e) => setToolbarHidden(true, { focus: e.detail === 0 }));

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

/** The Frame: Desktop | Phone, or on a real phone the one fixed choice. */
function frameGroup(s) {
  if (!isNarrow()) return segmentedGroup('Frame', FRAMES, (o) => o.key === s.frame, (o) => ({ frame: o.key }), 'rt-group--frame');
  return `<div class="rt-group rt-group--frame" role="group" aria-label="Frame">
    <span class="rt-group__title">Frame</span>
    <div class="rt-seg"><span class="rt-seg__opt is-on" aria-current="true">${NATIVE_FRAME_LABEL}</span></div>
  </div>`;
}

// Shorter Page names where the phone toolbar's dropdown has little room.
const SHORT_LABELS = { bag: 'Bag' };

/** The phone toolbar's Page dropdown: every Page, with the Pieces in place of "Piece",
 *  and the Frame shown (not choosable) at the end. */
function pageOptions(s) {
  const opts = PAGES.map((p) => {
    if (p.key !== 'piece')
      return `<option value="page:${p.key}"${p.key === s.page ? ' selected' : ''}>${esc(SHORT_LABELS[p.key] ?? p.label)}</option>`;
    return `<optgroup label="${esc(p.label)}">${PIECES.map(
      (pc) =>
        `<option value="piece:${pc.key}"${s.page === 'piece' && pc.key === s.piece ? ' selected' : ''}>${esc(pc.name)}</option>`,
    ).join('')}</optgroup>`;
  });
  opts.push(`<optgroup label="Frame"><option disabled>${esc(liveDetailLabel(s))}</option></optgroup>`);
  return opts.join('');
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

  slot('pagesel').innerHTML = pageOptions(s);

  slot('controls').innerHTML = [
    segmentedGroup('Name', names, (o) => o.key === s.name, (o) => ({ name: o.key }), 'rt-group--name'),
    frameGroup(s),
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
  slot('extra').textContent = ` · ${liveDetailLabel(s)}`;
}

root.addEventListener('change', (e) => {
  if (e.target.matches('[data-rt="piece"] select')) go({ piece: e.target.value });
  if (e.target.matches('[data-rt="pagesel"]')) {
    const [kind, key] = e.target.value.split(':');
    go(kind === 'piece' ? { page: 'piece', piece: key } : { page: key });
  }
});

// Keep --rt-h in step with the toolbar's real height (it wraps on narrow windows).
new ResizeObserver(() => {
  docEl.style.setProperty('--rt-h', `${root.offsetHeight}px`);
  fitDevice();
}).observe(root);
