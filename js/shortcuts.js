// Keyboard shortcuts for reviewers:
//   h   hide or show the toolbar (see the Page as a customer would; also a toolbar button)
// Ignored while typing in a field or with a modifier held, so forms and browser
// shortcuts keep working. (Round 1's ←/→ Layout keys went with the Layouts:
// every Page has one now.)

import { isToolbarHidden, setToolbarHidden } from './toolbar.js';

function isTyping(t) {
  return !!t?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
}

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
  if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    setToolbarHidden(!isToolbarHidden());
  }
});
