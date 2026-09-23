// The brand's logo, as the current Name has it (js/brand.js):
//   Biba   her hand-lettered script (the star over the i); the logo is the name
//   Anaar  the pomegranate mark beside the lowercase "anaar" wordmark
// Both images are rendered: the colour logo on light grounds and a knockout
// on photographs (the overlay header). CSS shows the right one.
//
// A logo with a separate `star` (Biba) is drawn as the logo without its star
// plus the star on its own over the i, so the star can twinkle on hover, focus
// or tap (styles/base.css, .wm__star). Anaar has no star and gets nothing.

import { esc } from './ui.js';

/**
 * @param {object} brand  the brand record (ctx.brand)
 * @param {object} opts   href, cls (an extra class)
 */
export function wordmark(brand, { href = '#', cls = '' } = {}) {
  const { logo: l } = brand;
  const starred = Boolean(l.star && l.plain);
  const logo = (src, variant) => `<img class="wm__logo wm__logo--${variant}" src="${src}" alt="">`;
  const star = starred
    ? `<span class="wm__star"><img class="wm__star-img wm__logo--colour" src="${l.star}" alt=""><img class="wm__star-img wm__star-img--knockout wm__logo--knockout" src="${l.star}" alt=""></span>`
    : '';
  const art = `<span class="wm__art" aria-hidden="true">${logo(starred ? l.plain : l.src, 'colour')}${logo(
    starred ? l.knockoutPlain : l.knockout,
    'knockout',
  )}${star}</span>`;
  const text = brand.wordmark ? `<span class="wm__text" aria-hidden="true">${esc(brand.wordmark)}</span>` : '';
  return `<a class="wm wm--${brand.key}${starred ? ' wm--star' : ''}${cls ? ` ${cls}` : ''}" href="${href}" aria-label="${esc(brand.name)}, home">${art}${text}</a>`;
}

// Tap: touch has no hover, so a press on a starred logo plays the twinkle once.
document.addEventListener('pointerdown', (e) => {
  const mark = e.target instanceof Element && e.target.closest('.wm--star');
  if (!mark) return;
  mark.classList.remove('is-twinkling');
  void mark.offsetWidth; // restart the animation if it is already playing
  mark.classList.add('is-twinkling');
});
document.addEventListener('animationend', (e) => {
  if (e.animationName.startsWith('wm-twinkle')) e.target.closest('.wm--star')?.classList.remove('is-twinkling');
});
