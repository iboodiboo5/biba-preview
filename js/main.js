// Boot: canonicalise the hash, then re-render the toolbar and the site on every change.

import * as state from './state.js';
import { renderToolbar } from './toolbar.js';
import { renderSite } from './site.js';
import { renderFavourites } from './favourites-view.js';
import './shortcuts.js';

function render(s) {
  renderToolbar(s);
  renderSite(s);
  renderFavourites(s);
}

state.subscribe(render);
render(state.init());
