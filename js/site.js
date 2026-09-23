// Renders the simulated website into #site: header, the current Page's Layout,
// footer and the phone menu. Also sizes the Phone frame.

import { serialise, effectiveLayout } from './state.js';
import { pageByKey } from './pages.js';
import { PIECES, DROP, DISPATCH, DELIVERY, pieceByKey, whatsappLink } from './pieces.js';
import { brandFor } from './brand.js';
import { img, pieceImg, resolve, pieceImageName } from './images.js';
import { wordmark } from './wordmark.js';
import { html, placeholder } from './ui.js';
import * as bag from './bag-store.js';

const $ = (sel) => document.querySelector(sel);
const site = $('#site');
const stage = $('#stage');
const scroller = site.querySelector('.site-scroll');
const top = site.querySelector('.site-top');
const main = site.querySelector('.site-main');
const bottom = site.querySelector('.site-bottom');
const layer = site.querySelector('.site-layer');

let renderToken = 0;
let lastViewKey = '';
let lastPage = '';
let cleanup = null;

export function makeCtx(s) {
  return {
    state: s,
    layout: effectiveLayout(s),
    pieces: PIECES,
    piece: pieceByKey(s.piece),
    drop: DROP,
    brand: brandFor(s.name),
    href: (patch = {}) => serialise({ ...s, ...patch }),
    img: (name, opts) => img(name, opts),
    pieceImg: (piece, kind, opts) => pieceImg(piece, kind, opts),
    pieceSrc: (piece, kind) => resolve(pieceImageName(piece, kind), { kind, ground: piece.ground }),
    bag,
  };
}

export async function renderSite(s) {
  const token = ++renderToken;
  const ctx = makeCtx(s);
  const page = pageByKey(s.page);

  stage.dataset.frame = s.frame;
  site.dataset.dir = s.dir;
  site.dataset.name = s.name;
  site.dataset.page = s.page;
  site.classList.remove('is-menu-open');
  brandTab(ctx.brand);

  let def;
  try {
    const mod = await page.load();
    def = mod.layouts?.[ctx.layout - 1];
  } catch (err) {
    console.error(`Could not load the ${page.label} page module`, err);
  }
  if (token !== renderToken) return;

  const layout = typeof def === 'function' ? { render: def } : def;
  site.dataset.header = layout?.header ?? 'solid';

  // enter() runs once each time the reviewer arrives on the Page, before render.
  const entering = s.page !== lastPage;
  lastPage = s.page;
  if (entering && layout?.enter) {
    try {
      layout.enter(ctx);
    } catch (err) {
      console.error(`${page.label} Layout ${ctx.layout} failed on entry`, err);
    }
  }

  let body;
  try {
    body = layout
      ? layout.render(ctx)
      : placeholder(ctx, { page: page.label, ticket: page.ticket });
  } catch (err) {
    console.error(`${page.label} Layout ${ctx.layout} failed to render`, err);
    body = placeholder(ctx, { page: page.label, ticket: page.ticket });
  }

  cleanup?.();
  cleanup = null;
  top.innerHTML = header(ctx);
  main.innerHTML = `<div class="page p-${s.page} ${s.page}-l${ctx.layout}" data-page="${s.page}" data-layout="${ctx.layout}">${body}</div>`;
  bottom.innerHTML = footer(ctx);
  layer.innerHTML = menu(ctx);

  if (layout?.mount) {
    try {
      cleanup = layout.mount(main.firstElementChild, ctx) ?? null;
    } catch (err) {
      console.error(`${page.label} Layout ${ctx.layout} failed to mount`, err);
    }
  }

  const viewKey = `${s.page}|${s.piece}|${ctx.layout}`;
  if (viewKey !== lastViewKey) scroller.scrollTop = 0;
  lastViewKey = viewKey;
  fitDevice();
}

/* ---------- Browser tab: title and icon follow the Name ---------- */

function iconLink(rel) {
  let link = document.head.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  return link;
}

function brandTab(brand) {
  document.title = `${brand.name} · Website preview`;
  const icon = iconLink('icon');
  if (icon.getAttribute('href') !== brand.logo.favicon) {
    icon.type = 'image/png';
    icon.href = brand.logo.favicon;
  }
  iconLink('apple-touch-icon').href = brand.logo.touchIcon;
}

/* ---------- Site chrome ---------- */

const NAV_LEFT = [
  { page: 'collection', label: 'Shop' },
  { page: 'story', label: 'Our Story' },
];
const NAV_RIGHT = [{ page: 'help', label: 'Help' }];

function navLink(ctx, { page, label }) {
  const current = ctx.state.page === page ? ' aria-current="page"' : '';
  return `<a class="site-nav__link" href="${ctx.href({ page })}"${current}>${label}</a>`;
}

function bagLink(ctx, cls = '') {
  return `<a class="site-nav__link site-bag ${cls}" href="${ctx.href({ page: 'bag' })}"${
    ctx.state.page === 'bag' ? ' aria-current="page"' : ''
  }>Bag <span class="site-bag__count" data-bag-count>${bag.count()}</span></a>`;
}

function header(ctx) {
  return html`
    <div class="site-announce">
      <p>Dispatched in ${DISPATCH.days}<span class="site-announce__rest"><span class="site-announce__sep">·</span>${DELIVERY.text.replace(/\.$/, '')}</span></p>
    </div>
    <header class="site-header">
      <div class="site-header__inner">
        <nav class="site-nav site-nav--left" aria-label="Main">
          ${NAV_LEFT.map((l) => navLink(ctx, l))}
        </nav>
        <button class="site-menu-btn" type="button" data-action="menu-open" aria-label="Open menu">
          <span class="site-menu-btn__lines" aria-hidden="true"></span><span class="site-menu-btn__label">Menu</span>
        </button>
        <div class="site-header__brand">${wordmark(ctx.brand, { href: ctx.href({ page: 'home' }) })}</div>
        <nav class="site-nav site-nav--right" aria-label="Account">
          ${NAV_RIGHT.map((l) => navLink(ctx, l))}
          ${bagLink(ctx)}
        </nav>
      </div>
    </header>`;
}

function footer(ctx) {
  const link = (page, label) => `<li><a href="${ctx.href({ page })}">${label}</a></li>`;
  return html`
    <footer class="site-footer">
      <div class="wrap">
        <div class="site-footer__top">
          <div class="site-footer__brand">
            ${wordmark(ctx.brand, { href: ctx.href({ page: 'home' }) })}
          </div>
          <ul class="site-footer__links">
            ${link('collection', 'Shop')}${link('story', 'Our story')}${link('help', 'Sizes')}${link('help', 'Delivery and exchanges')}
            <li><a href="${whatsappLink(ctx.brand.hello())}" target="_blank" rel="noopener">WhatsApp</a></li>
            <li class="site-footer__soon">Instagram soon</li>
          </ul>
          <form class="site-footer__letter" data-demo-form>
            <div class="site-footer__field">
              <input type="email" placeholder="Email for new designs" aria-label="Email for new designs">
              <button type="submit">Sign up</button>
            </div>
          </form>
        </div>
        <div class="site-footer__base">
          <p>© 2026 ${ctx.brand.name}. Made in Pakistan.</p>
        </div>
      </div>
    </footer>`;
}

function menu(ctx) {
  const items = [
    { page: 'home', label: 'Home' },
    { page: 'collection', label: 'Shop' },
    { page: 'story', label: 'Our Story' },
    { page: 'help', label: 'Help' },
  ];
  return html`
    <div class="site-menu" role="dialog" aria-label="Menu">
      <div class="site-menu__bar">
        ${wordmark(ctx.brand, { href: ctx.href({ page: 'home' }) })}
        <button class="site-menu__close" type="button" data-action="menu-close">Close</button>
      </div>
      <nav class="site-menu__nav">
        ${items.map((i) => `<a href="${ctx.href({ page: i.page })}">${i.label}</a>`)}
      </nav>
      <p class="site-menu__foot">${bagLink(ctx)}</p>
    </div>`;
}

/* ---------- Behaviour ---------- */

site.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'menu-open') site.classList.add('is-menu-open');
  if (action === 'menu-close') site.classList.remove('is-menu-open');
});
site.addEventListener('submit', (e) => {
  if (e.target.matches('[data-demo-form]')) e.preventDefault();
});
bag.subscribe(() => {
  site.querySelectorAll('[data-bag-count]').forEach((el) => (el.textContent = bag.count()));
});

/* ---------- Phone frame ---------- */

const DEVICE_W = 390 + 2 * 12;
const DEVICE_H = 844 + 2 * 12;

export function fitDevice() {
  if (stage.dataset.frame !== 'phone') {
    stage.style.removeProperty('--device-scale');
    return;
  }
  const room = stage.clientHeight - 56;
  const scale = Math.min(1, Math.max(0.4, room / DEVICE_H));
  stage.style.setProperty('--device-scale', scale.toFixed(4));
  stage.style.setProperty('--device-w', `${DEVICE_W * scale}px`);
  stage.style.setProperty('--device-h', `${DEVICE_H * scale}px`);
}
window.addEventListener('resize', fitDevice);

