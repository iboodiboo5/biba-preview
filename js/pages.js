// Page registry. The toolbar and the state module read Layout counts from here.
// Round 2: every Page has exactly one Layout (Home's Banner options collapsed to
// the Cover banner). `ticket` names the round-2 ticket that rebuilds the Page;
// it shows on the placeholder if a Page module has no Layout yet.

export const PAGES = [
  { key: 'home',       label: 'Home',             layouts: 1, ticket: '04', load: () => import('./pages/home.js') },
  { key: 'collection', label: 'Collection',       layouts: 1, ticket: '07', load: () => import('./pages/collection.js') },
  { key: 'piece',      label: 'Piece',            layouts: 1, ticket: '05', load: () => import('./pages/piece.js') },
  { key: 'story',      label: 'Story',            layouts: 1, ticket: '07', load: () => import('./pages/story.js') },
  { key: 'bag',        label: 'Bag and checkout', layouts: 1, ticket: '06', load: () => import('./pages/bag.js') },
  { key: 'help',       label: 'Help',             layouts: 1, ticket: '07', load: () => import('./pages/help.js') },
];

export const MAX_LAYOUTS = Math.max(...PAGES.map((p) => p.layouts));

export function pageByKey(key) {
  return PAGES.find((p) => p.key === key) ?? PAGES[0];
}
