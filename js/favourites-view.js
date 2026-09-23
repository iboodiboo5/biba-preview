// Ticket 08 UI: the ♡ and Favourites controls in the toolbar's #rt-actions slot,
// and the Favourites view (a tool screen over the stage, never styled by a Direction).
// Talks to js/favourites.js only through its interface; never knows the backend.

import * as favourites from './favourites.js';
import { href, go, current, label, detailLabel, effectiveLayout } from './state.js';

const HEART =
  '<svg class="rt-fav__icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 20.3s-7.6-4.6-9.2-9.4C1.7 7.4 3.9 4 7.4 4c2 0 3.4 1.1 4.6 2.7C13.2 5.1 14.6 4 16.6 4c3.5 0 5.7 3.4 4.6 6.9-1.6 4.8-9.2 9.4-9.2 9.4z"/></svg>';

// The Favourites link's icon, shown on phones where the word doesn't fit.
const LIST =
  '<svg class="rt-favs-link__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 6.5h14M5 12h14M5 17.5h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

// Published inside claude.ai the Favourites are shared; anywhere else (GitHub
// Pages, a local server) they stay in this browser, and the view says so.
const SHARED_HOST = /(^|\.)(claude\.ai|claudeusercontent\.com)$/.test(location.hostname);
const LOCAL_NOTE = 'Favourites are saved on this device only.';

const actions = document.getElementById('rt-actions');
actions.innerHTML = `
  <button class="rt-fav" type="button" data-fav="toggle" aria-pressed="false" title="Save this Combination as a Favourite">
    ${HEART}<span class="rt-fav__text">Favourite</span>
  </button>
  <a class="rt-favs-link" data-fav="view" href="#">${LIST}<span class="rt-favs-link__text">Favourites</span> <span class="rt-count" data-fav="count">0</span></a>
`;
const favBtn = actions.querySelector('[data-fav="toggle"]');
const favText = favBtn.querySelector('.rt-fav__text');
const viewLink = actions.querySelector('[data-fav="view"]');
const countEl = actions.querySelector('[data-fav="count"]');

const view = document.createElement('section');
view.className = 'rt-favs';
view.id = 'rt-favs';
view.hidden = true;
view.setAttribute('aria-label', 'Favourites');
view.innerHTML = `
  <div class="rt-favs__inner">
    <header class="rt-favs__head">
      <div>
        <p class="rt-favs__eyebrow">Review</p>
        <h1 class="rt-favs__title">Favourites <span class="rt-favs__total" data-fav="total"></span></h1>
        <p class="rt-favs__note" data-fav="note"></p>
      </div>
      <a class="rt-btn rt-btn--quiet" data-fav="back" href="#">Back to the site <kbd>Esc</kbd></a>
    </header>
    <p class="rt-favs__error" data-fav="error" hidden></p>
    <ol class="rt-favs__list" data-fav="list"></ol>
    <div class="rt-favs__empty" data-fav="empty" hidden>
      <p class="rt-favs__empty-title">No Favourites yet</p>
      <p>Walk the site and press <span class="rt-favs__heart">${HEART} Favourite</span> in the toolbar on any Combination you like. Everyone's choices collect here.</p>
    </div>
    <footer class="rt-favs__keys">
      <span><kbd>←</kbd><kbd>→</kbd> Home banner</span>
      <span><kbd>h</kbd> Hide the toolbar</span>
      <span><kbd>Esc</kbd> Close Favourites</span>
    </footer>
  </div>
`;
document.body.appendChild(view);
const viewPart = (name) => view.querySelector(`[data-fav="${name}"]`);

let s = current();
let favs = favourites.list();
let info = favourites.status();

/* ---------- Labels ---------- */

// Names come from state.js (label, detailLabel), the same functions the toolbar
// uses, so a Favourite reads exactly as the toolbar did when it was saved.

function when(ms) {
  const d = Math.max(0, Date.now() - ms);
  if (d < 60e3) return 'just now';
  if (d < 3600e3) return `${Math.round(d / 60e3)} min ago`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)} h ago`;
  return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const currentCombo = () => ({ ...s, layout: effectiveLayout(s) });

/* ---------- Toolbar controls ---------- */

function favButtonTitle({ saved, inView }) {
  if (!info.ready) return 'Connecting to the shared Favourites…';
  if (inView) return 'Go back to the site to save a Combination';
  if (saved) return 'Saved. Click to remove your Favourite';
  if (info.canWrite) return 'Save this Combination as a Favourite';
  return info.error || 'Favourites are read-only here';
}

function renderActions() {
  const saved = favourites.mineFor(currentCombo()).length > 0;
  const inView = s.view === 'favourites';

  favBtn.classList.toggle('is-on', saved);
  favBtn.setAttribute('aria-pressed', String(saved));
  favText.textContent = saved ? 'Saved' : 'Favourite';
  favBtn.disabled = inView || !info.ready || (!saved && !info.canWrite);
  favBtn.title = favButtonTitle({ saved, inView });

  countEl.textContent = String(favs.length);
  viewLink.classList.toggle('is-on', inView);
  viewLink.href = href({ view: inView ? 'site' : 'favourites' });
  if (inView) viewLink.setAttribute('aria-current', 'page');
  else viewLink.removeAttribute('aria-current');
}

favBtn.addEventListener('click', async () => {
  const combo = currentCombo();
  const mine = favourites.mineFor(combo);
  favBtn.disabled = true;
  if (mine.length) {
    for (const f of mine) await favourites.remove(f.id);
  } else {
    await favourites.add(combo);
  }
  renderActions();
});

/* ---------- Favourites view ---------- */

// Identical Combinations saved by several reviewers become one row with several votes.
function groups() {
  const byKey = new Map();
  for (const f of favs) {
    const key = favourites.comboKey(f.combo);
    if (!byKey.has(key)) byKey.set(key, { key, combo: f.combo, items: [] });
    byKey.get(key).items.push(f);
  }
  const grouped = [...byKey.values()];
  for (const g of grouped) g.latest = Math.max(...g.items.map((f) => f.at));
  // Most votes first, then most recent.
  return grouped.sort((a, b) => b.items.length - a.items.length || b.latest - a.latest);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function row(g) {
  const li = el('li', 'rt-favs__item');
  const nowKey = favourites.comboKey(currentCombo());
  if (g.key === nowKey) li.classList.add('is-current');

  const swatch = el('i', 'rt-swatch rt-swatch--c');
  swatch.setAttribute('aria-hidden', 'true');

  const body = el('div', 'rt-favs__body');
  const title = el('p', 'rt-favs__name', label(g.combo));
  if (g.items.length > 1) title.appendChild(el('span', 'rt-favs__votes', `${g.items.length} votes`));
  if (g.key === nowKey) title.appendChild(el('span', 'rt-favs__now', 'Behind this screen'));
  body.append(title, el('p', 'rt-favs__detail', detailLabel(g.combo)));

  // Who saved it and when, one entry per vote, names set as text.
  const who = el('p', 'rt-favs__who');
  const people = [...g.items].sort((a, b) => b.at - a.at);
  who.append('Saved by ');
  people.forEach((f, i) => {
    if (i) who.append(', ');
    who.appendChild(el('span', f.mine ? 'rt-favs__person is-me' : 'rt-favs__person', f.who));
    who.appendChild(el('span', 'rt-favs__when', ` ${when(f.at)}`));
  });
  body.appendChild(who);

  const buttons = el('div', 'rt-favs__acts');
  const open = el('a', 'rt-btn', 'Open');
  open.href = href({ ...g.combo, view: 'site' });
  buttons.appendChild(open);
  const mine = g.items.filter((f) => f.mine);
  if (mine.length) {
    const removeBtn = el('button', 'rt-btn rt-btn--quiet', 'Remove');
    removeBtn.type = 'button';
    removeBtn.title = g.items.length > mine.length ? 'Remove your vote (others keep theirs)' : 'Remove this Favourite';
    removeBtn.addEventListener('click', async () => {
      removeBtn.disabled = true;
      for (const f of mine) await favourites.remove(f.id);
    });
    buttons.appendChild(removeBtn);
  }

  li.append(swatch, body, buttons);
  return li;
}

function renderView() {
  const on = s.view === 'favourites';
  view.hidden = !on;
  document.documentElement.classList.toggle('rt-favs-open', on);
  if (!on) return;

  viewPart('back').href = href({ view: 'site' });
  viewPart('total').textContent = favs.length ? String(favs.length) : '';
  viewPart('note').textContent = !SHARED_HOST ? LOCAL_NOTE : info.ready ? info.note : 'Connecting…';
  const err = viewPart('error');
  err.hidden = !info.error;
  err.textContent = info.error;

  viewPart('list').replaceChildren(...groups().map(row));
  viewPart('empty').hidden = !info.ready || favs.length > 0;
}

function renderAll() {
  renderActions();
  renderView();
}

/** Called by main.js on every Combination change. */
export function renderFavourites(next) {
  s = next;
  renderAll();
}

favourites.subscribe((latest, latestStatus) => {
  favs = latest;
  info = latestStatus;
  renderAll();
});

// Relative times ("5 min ago") stay fresh while the view is open.
setInterval(() => {
  if (s.view === 'favourites') renderView();
}, 60e3);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && s.view === 'favourites' && !e.defaultPrevented) go({ view: 'site' });
});
