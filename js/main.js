// Boot: canonicalise the hash, then re-render the toolbar and the site on every change.
//
// Scroll: going back (or forward) through history returns to where the reviewer
// was on that entry; a new Page or Piece reached by a link starts at the top.
// Each history entry is stamped with an id in history.state, so a fresh entry
// (a link, the toolbar) can be told apart from a revisited one (back/forward).
// Whatever scrolls is used: the document in the native phone Frame, the site's
// own scroll box everywhere else.

import * as state from './state.js';
import { renderToolbar } from './toolbar.js';
import { renderSite } from './site.js';
import { renderFavourites } from './favourites-view.js';
import { siteScroller as scroller } from './ui.js';
import './shortcuts.js';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const positions = new Map(); // entry id -> scroll top when the reviewer left it
let entry = null;
let lastView = '';
let seq = 0;

function scrollTo(y) {
  const el = scroller();
  if (el) el.scrollTop = y;
}

/** This history entry's id, stamping it first if it is new. */
function stamp() {
  const known = history.state?.rtEntry;
  if (known) return { id: known, fresh: false };
  const id = `${Date.now().toString(36)}-${++seq}`;
  history.replaceState({ ...(history.state ?? {}), rtEntry: id }, '', location.hash);
  return { id, fresh: true };
}

function render(s) {
  // The DOM still shows the entry being left, so its scroll is still accurate.
  if (entry) positions.set(entry, scroller()?.scrollTop ?? 0);
  const { id, fresh } = stamp();
  entry = id;
  const view = `${s.page}|${s.page === 'piece' ? s.piece : ''}`;
  const newView = view !== lastView;
  lastView = view;

  renderToolbar(s);
  const drawn = renderSite(s);
  renderFavourites(s);

  drawn.then(() => {
    if (entry !== id) return; // overtaken by a later change
    if (!fresh && positions.has(id)) {
      const y = positions.get(id);
      scrollTo(y);
      // Late layout (fonts, images) can leave the page too short on the first try.
      requestAnimationFrame(() => {
        if (entry === id && Math.abs((scroller()?.scrollTop ?? 0) - y) > 2) scrollTo(y);
      });
    } else if (newView) {
      scrollTo(0);
    }
  });
}

state.subscribe(render);
render(state.init());
