// Piece: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.
//
//   1 Atelier    straight gallery beside a sticky buying column
//
// The column, top to bottom: name, price, one line, what the two-piece is,
// size buttons with a "Size chart" that opens in the page, the fit line, the
// dupatta add-on, the total, Add to bag (or Sold out) and WhatsApp, then short facts.
// Every image on this Page is a plain rectangle, as everywhere in round 2.
// A stand-in Piece (isSample) carries a quiet "Sample design" tag, and its
// print is described as a sample print idea, never as one of hers.
//
// Phone: the gallery is a full-width 4:5 swipe row with dots, the name and price
// sit right under it (no breadcrumb), and a bar stays at the foot of the screen,
// "Add to bag · PKR x" (not rendered for a sold-out Piece).
// Feedback: a missing size shows an error under the Size row, outlines the size
// buttons and moves focus to them; adding shows a toast just under the header.

import { html, esc, media, pieceCard, sectionHead, sampleTag } from '../ui.js';
import { sizeChart, markSizeChartRow } from '../size-chart.js';
import {
  SIZES, SIZE_CHART, TROUSERS, FABRIC, CARE, DISPATCH, DELIVERY, EXCHANGES,
  formatPKR, whatsappLink, isSample, paymentText,
} from '../pieces.js';

/* ---------- Parts ---------- */

function whatsappHref(ctx, piece, size = '', dupatta = false) {
  if (piece.soldOut) return whatsappLink(ctx.brand.hello(`${piece.name} is sold out. Will it come back?`));
  const sizeLine = !size ? 'Could you help me choose a size?' : `My size is ${size}.`;
  const dupattaLine = dupatta ? ` With the matching dupatta (${formatPKR(piece.dupattaPrice)}).` : '';
  const text = ctx.brand.hello(`I would like to order ${piece.name} (${formatPKR(piece.price)}).${dupattaLine} ${sizeLine}`);
  return whatsappLink(text);
}

/** The next n Pieces after the current one, wrapping round the collection, sold-out ones left out. */
function nextPieces(ctx, n) {
  const i = ctx.pieces.indexOf(ctx.piece);
  const len = ctx.pieces.length;
  return Array.from({ length: len - 1 }, (_, k) => ctx.pieces[(i + 1 + k) % len])
    .filter((q) => !q.soldOut)
    .slice(0, n);
}

/** The print swatch's file from the image resolver, for tiling as a fabric surface. */
function printTile(ctx, p) {
  const { src } = ctx.pieceSrc(p, 'print');
  // Absolute, because a url() inside a custom property resolves against the stylesheet that uses it.
  // No file: leave the property unset and the tile shows its plain media ground.
  return src ? `--piece-print: url('${new URL(src, document.baseURI).href}');` : '';
}

const trouserName = (p) => TROUSERS[p.trouser].toLowerCase();

function crumbs(ctx, p) {
  return html`<nav class="piece-crumbs" aria-label="Breadcrumb">
    <a href="${ctx.href({ page: 'collection' })}">Collection</a><span aria-hidden="true">/</span><span>${p.name}</span>
  </nav>`;
}

const sizeLabelId = (p) => `piece-l1-size-label-${p.key}`;
const sizeErrorId = (p) => `piece-l1-size-error-${p.key}`;

function sizeChips(p) {
  return html`<div class="piece-sizes" role="radiogroup" aria-labelledby="${sizeLabelId(p)}" aria-describedby="${sizeErrorId(p)}" data-sizes>
    ${SIZES.map(
      (s) => `<label class="piece-size"><input type="radio" name="size-${p.key}" value="${s}" data-size${p.soldOut ? ' disabled' : ''}><span>${s}</span></label>`,
    )}
  </div>`;
}

/** The size chart, folded into the buying column; opened and closed by the one "Size chart" button (or Esc). */
const chartId = (p) => `piece-l1-chart-${p.key}`;

/** Which chart columns are body measurements; the rest (the lengths) are the finished garment. */
const BODY_COLUMNS = ['bust', 'waist', 'hips'];

/**
 * The shared chart with a group row over its columns: "Body" over bust, waist and
 * hips, "Finished garment" over the lengths, so the columns agree with the footnote.
 * (This row belongs in js/size-chart.js so Help gets it too: see ticket 04's Comments.)
 */
function groupedChart() {
  const keys = SIZE_CHART.columns.map(([key]) => key);
  const body = keys.filter((k) => BODY_COLUMNS.includes(k)).length;
  const garment = keys.length - body;
  const groups = `<tr class="piece-l1__chart-groups"><td></td>${
    body ? `<th scope="colgroup" colspan="${body}">Body</th>` : ''
  }${garment ? `<th scope="colgroup" colspan="${garment}">Finished garment</th>` : ''}</tr>`;
  return sizeChart().replace('<thead>', `<thead>${groups}`);
}

function chartPanel(p) {
  return html`<div class="piece-l1__chart" id="${chartId(p)}" data-chart hidden>
    <p class="piece-l1__chart-title">Size chart, in inches</p>
    ${groupedChart()}
    <p class="piece-l1__chart-note s-meta">Body: measure yourself at the bust, waist and hips. Finished garment: the length of the kurta and shalwar as made.${SIZE_CHART.placeholder ? ' Placeholder figures until the final chart is in.' : ''} No custom sizing.</p>
  </div>`;
}

/** The fit line (a placeholder until the client gives the model's size) and the between-sizes link. */
function fitLine(ctx, p) {
  const ask = whatsappLink(ctx.brand.hello(`I'm between two sizes for ${p.name}. Which should I choose?`));
  return html`<div class="piece-l1__fit">
    <p class="s-meta piece-l1__fit-model">Model is 5'6" and wears S <span class="piece-l1__placeholder">placeholder</span></p>
    <a class="piece-l1__fit-ask" href="${ask}" target="_blank" rel="noopener">Between sizes? Ask us on WhatsApp</a>
  </div>`;
}

/** Size, size chart, fit, dupatta, total, Add to bag and WhatsApp. Wired up by wireBuying(). */
function buyForm(ctx, p) {
  return html`<form class="piece-buy${p.soldOut ? ' is-sold-out' : ''}" data-demo-form data-piece-buy>
    <div class="piece-buy__head">
      <p class="piece-buy__label" id="${sizeLabelId(p)}">Size <span class="piece-buy__chosen" data-size-label></span></p>
      <button class="piece-buy__guide" type="button" data-chart-toggle aria-expanded="false" aria-controls="${chartId(p)}">Size chart</button>
    </div>
    ${sizeChips(p)}
    <p class="piece-buy__error" id="${sizeErrorId(p)}" data-size-error hidden>Choose a size first.</p>
    ${chartPanel(p)}
    ${!p.soldOut && fitLine(ctx, p)}

    ${!p.soldOut && html`<label class="piece-buy__dupatta">
      <input type="checkbox" role="switch" data-dupatta>
      <span class="piece-buy__switch" aria-hidden="true"></span>
      <span class="piece-buy__dupatta-text">
        <span>Add the matching dupatta (+${formatPKR(p.dupattaPrice)})</span>
        <span class="s-meta">${FABRIC.dupatta}, in the same print. Sold only as an <span class="piece-buy__nowrap">add-on</span>.</span>
      </span>
    </label>

    <p class="piece-buy__total">
      <span class="piece-buy__total-label">Total <span class="s-meta" data-total-note>two-piece</span></span>
      <span class="s-price" data-total>${formatPKR(p.price)}</span>
    </p>`}

    <div class="piece-buy__actions">
      <button class="s-btn piece-buy__add" type="submit"${p.soldOut ? ' disabled aria-disabled="true"' : ''}>${p.soldOut ? 'Sold out' : 'Add to bag'}</button>
      <a class="s-btn s-btn--quiet piece-buy__wa" href="${whatsappHref(ctx, p)}" target="_blank" rel="noopener" data-wa>${p.soldOut ? 'Ask on WhatsApp' : 'Order on WhatsApp'}</a>
    </div>
    ${p.soldOut && `<p class="s-meta piece-buy__note">${p.name} has sold out: stock is limited. Message us on WhatsApp to hear if it comes back.</p>`}
  </form>`;
}

/** The phone's buy bar, at the foot of the screen. Not rendered for a sold-out Piece. */
function buyBar(p) {
  if (p.soldOut) return '';
  return html`<div class="piece-l1__bar" data-bar>
    <button class="s-btn piece-l1__bar-add" type="button" data-bar-add>Add to bag · <span data-total>${formatPKR(p.price)}</span></button>
  </div>`;
}

/** The print, as the facts say it: hers are hand-painted; a stand-in's is a sample idea. */
const printText = (p) =>
  isSample(p)
    ? `A sample print idea, standing in until the next designs are ready: ${p.print.charAt(0).toLowerCase()}${p.print.slice(1)}`
    : `${p.groundLabel}, hand-painted by our founder. ${p.print}`;

/** Short facts under the buying column. */
function facts(p) {
  const rows = [
    ['Fabric', `${FABRIC.kurta} kurta and shalwar. ${FABRIC.dupatta} dupatta.`],
    ['Print', printText(p)],
    ['Care', `${CARE.text}${CARE.placeholder ? ' (Placeholder.)' : ''}`],
    ['Dispatch', `In ${DISPATCH.days}.`],
    ['Delivery', `${DELIVERY.text} Pay by ${paymentText()}.`],
    ['Exchanges', `${EXCHANGES.short}. Message us on WhatsApp if anything is wrong.`],
  ];
  return html`<dl class="piece-l1__facts">
    ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)}
  </dl>`;
}

/**
 * Wires the buying column inside `el`: one chosen size and dupatta choice drive
 * the size label, the marked chart row, the totals (form and phone bar) and the
 * WhatsApp message. Add to bag (in the form or the phone bar) puts that exact line
 * in the bag and says what went in, in a toast under the header.
 */
function wireBuying(el, ctx, p) {
  let size = '';
  let dupatta = false;
  let toastTimer = 0;
  const all = (sel) => el.querySelectorAll(sel);
  const total = () => ctx.bag.unitPrice({ piece: p.key, dupatta });

  const setAsking = (on) => {
    all('[data-piece-buy]').forEach((f) => f.classList.toggle('is-asking', on));
    all('[data-size-error]').forEach((n) => (n.hidden = !on));
    all('[data-sizes]').forEach((g) => (on ? g.setAttribute('aria-invalid', 'true') : g.removeAttribute('aria-invalid')));
  };

  const sync = () => {
    all('[data-size]').forEach((input) => (input.checked = input.value === size));
    all('[data-size-label]').forEach((n) => (n.textContent = size ? `· ${size}` : ''));
    all('[data-dupatta]').forEach((n) => (n.checked = dupatta));
    all('[data-total]').forEach((n) => (n.textContent = formatPKR(total())));
    all('[data-total-note]').forEach((n) => (n.textContent = dupatta ? 'two-piece and dupatta' : 'two-piece'));
    all('[data-wa]').forEach((a) => (a.href = whatsappHref(ctx, p, size, dupatta)));
    markSizeChartRow(el, size);
  };

  const setChart = (open, { focus = false } = {}) => {
    all('[data-chart]').forEach((c) => (c.hidden = !open));
    all('[data-chart-toggle]').forEach((b) => {
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? 'Hide size chart' : 'Size chart';
      if (focus) b.focus();
    });
  };

  const hideToast = () => {
    clearTimeout(toastTimer);
    all('[data-toast]').forEach((t) => (t.innerHTML = ''));
  };
  const armToast = () => {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 8000);
  };
  const showToast = () => {
    const what = dupatta ? 'with the matching dupatta' : 'without the dupatta';
    const count = ctx.bag.count();
    all('[data-toast]').forEach(
      (t) =>
        (t.innerHTML = html`<div class="piece-l1__toast" role="status">
          <div class="piece-l1__toast-body">
            <p class="piece-l1__toast-head">Added to your bag</p>
            <p class="piece-l1__toast-line">${esc(p.name)} · size ${size} · ${what}</p>
            <p class="piece-l1__toast-line s-meta">${formatPKR(total())} · ${count} ${count === 1 ? 'piece' : 'pieces'} in your bag</p>
          </div>
          <a class="s-btn piece-l1__toast-view" href="${ctx.href({ page: 'bag' })}">View bag</a>
          <button class="piece-l1__toast-close" type="button" data-toast-close aria-label="Close">×</button>
        </div>`),
    );
    armToast();
  };

  /** Ask for a size: error under the Size row, outlined buttons, focus on them. */
  const askForSize = () => {
    setAsking(true);
    const target = el.querySelector('[data-size]:not(:disabled)');
    const row = el.querySelector('[data-sizes]');
    // Brings the row into view only when it is off screen (the phone bar can be far
    // from it), then focuses without jumping again.
    const view = el.closest('.site-scroll')?.getBoundingClientRect() ?? { top: 0, bottom: innerHeight };
    const box = row?.getBoundingClientRect();
    const header = el.closest('.site-scroll')?.querySelector('.site-header')?.offsetHeight ?? 0;
    const bar = el.querySelector('[data-bar]')?.offsetHeight ?? 0;
    if (box && (box.top < view.top + header || box.bottom + 40 > view.bottom - bar)) {
      row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    target?.focus({ preventScroll: true });
  };

  const tryAdd = () => {
    if (!ctx.bag.canAdd(p.key)) return;
    if (!size) return askForSize();
    if (!ctx.bag.add(p.key, size, 1, dupatta)) return;
    showToast();
  };

  const onChange = (e) => {
    if (e.target.matches('[data-dupatta]')) dupatta = e.target.checked;
    else if (e.target.matches('[data-size]')) {
      size = e.target.value;
      setAsking(false);
    } else return;
    sync();
  };
  const onClick = (e) => {
    const toggle = e.target.closest('[data-chart-toggle]');
    if (toggle) setChart(toggle.getAttribute('aria-expanded') !== 'true');
    else if (e.target.closest('[data-bar-add]')) tryAdd();
    else if (e.target.closest('[data-toast-close]')) hideToast();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && e.target.closest('[data-chart]')) setChart(false, { focus: true });
    else if (e.key === 'Escape' && e.target.closest('[data-toast]')) hideToast();
  };
  const onSubmit = (e) => {
    if (!e.target.closest('[data-piece-buy]')) return;
    e.preventDefault();
    tryAdd();
  };
  // A toast being read or used stays up.
  const onHold = (e) => {
    if (e.target.closest?.('[data-toast]')) clearTimeout(toastTimer);
  };
  const onRelease = (e) => {
    if (e.target.closest?.('[data-toast]') && el.querySelector('[data-toast] .piece-l1__toast')) armToast();
  };

  el.addEventListener('change', onChange);
  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKey);
  el.addEventListener('submit', onSubmit);
  el.addEventListener('pointerover', onHold);
  el.addEventListener('focusin', onHold);
  el.addEventListener('pointerout', onRelease);
  sync();
  return () => {
    clearTimeout(toastTimer);
    el.removeEventListener('change', onChange);
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onKey);
    el.removeEventListener('submit', onSubmit);
    el.removeEventListener('pointerover', onHold);
    el.removeEventListener('focusin', onHold);
    el.removeEventListener('pointerout', onRelease);
  };
}

/** The phone gallery's dots: follow the swipe row, and jump to a picture when tapped. */
function wireDots(el) {
  const row = el.querySelector('.piece-l1__gallery');
  const dots = [...el.querySelectorAll('[data-dot]')];
  if (!row || !dots.length) return () => {};
  const mark = () => {
    const i = Math.round(row.scrollLeft / Math.max(1, row.clientWidth));
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  };
  const onClick = (e) => {
    const dot = e.target.closest('[data-dot]');
    if (dot) row.scrollTo({ left: Number(dot.dataset.dot) * row.clientWidth, behavior: 'smooth' });
  };
  row.addEventListener('scroll', mark, { passive: true });
  el.addEventListener('click', onClick);
  mark();
  return () => {
    row.removeEventListener('scroll', mark);
    el.removeEventListener('click', onClick);
  };
}

/* ================= Layout 1 · Atelier ================= */
/* A straight gallery on the left, a sticky buying column on the right. */

const atelier = {
  name: 'Atelier',
  render(ctx) {
    const p = ctx.piece;
    const shots = ['Worn', 'Close up', 'The print'];

    return html`
      <div class="piece-l1__toast-dock" data-toast aria-live="polite"></div>
      <section class="piece-l1__main">
        <div class="wrap piece-l1__grid">
          <div class="piece-l1__pics">
            <div class="piece-l1__gallery">
              <figure class="piece-l1__lead">${media(ctx.pieceImg(p, 'front', { loading: 'eager', alt: `${p.name}, worn` }))}</figure>
              <figure class="piece-l1__shot">${media(ctx.pieceImg(p, 'detail', { loading: 'eager', alt: `${p.name}, close up` }))}<figcaption class="s-caption">Close up</figcaption></figure>
              <figure class="piece-l1__cloth">
                <div class="piece-l1__cloth-tile" style="${printTile(ctx, p)}" role="img" aria-label="The ${p.name} print"></div>
                <figcaption class="s-caption">${isSample(p) ? 'A sample print idea' : 'The print'}, on ${p.groundLabel.toLowerCase()}</figcaption>
              </figure>
            </div>
            <div class="piece-l1__dots" aria-label="Pictures">
              ${shots.map((s, i) => `<button type="button" class="piece-l1__dot" data-dot="${i}" aria-label="${s}"></button>`)}
            </div>
          </div>

          <div class="piece-l1__panel">
            ${crumbs(ctx, p)}
            <div class="piece-l1__titles">
              <h1 class="s-display s-display--m piece-l1__name">${p.name}</h1>
              <p class="piece-l1__price-row">
                <span class="s-price piece-l1__price">${formatPKR(p.price)}</span>
                ${p.soldOut && '<span class="piece-l1__sold">Sold out</span>'}
              </p>
              ${isSample(p) && sampleTag('piece-l1__sample')}
            </div>
            <p class="s-body piece-l1__desc">${p.description}</p>
            <p class="s-meta piece-l1__kind">A two-piece: a short kurta and ${trouserName(p)}, both in ${FABRIC.kurta.toLowerCase()}.</p>
            ${buyForm(ctx, p)}
            ${facts(p)}
          </div>
        </div>
      </section>

      <section class="piece-l1__more">
        <div class="wrap">
          ${sectionHead({
            title: 'More pieces',
            link: `<a class="s-link" href="${ctx.href({ page: 'collection' })}">View all</a>`,
          })}
          <div class="piece-l1__grid-more">${nextPieces(ctx, 4).map((q) => pieceCard(q, ctx))}</div>
        </div>
      </section>
      ${buyBar(p)}`;
  },
  mount(el, ctx) {
    // A buying column taller than the screen sticks by its foot instead of its head,
    // so the last fact is always reachable (the size chart makes it taller when open).
    const panel = el.querySelector('.piece-l1__panel');
    const scroller = el.closest('.site-scroll');
    const fit = () => {
      if (!scroller) return;
      const head = (scroller.querySelector('.site-header')?.offsetHeight ?? 0) + 28;
      const foot = scroller.clientHeight - panel.offsetHeight - 28;
      panel.style.top = `${Math.min(head, foot)}px`;
    };
    const ro = new ResizeObserver(fit);
    ro.observe(panel);
    if (scroller) ro.observe(scroller);
    const unwire = wireBuying(el, ctx, ctx.piece);
    const unDots = wireDots(el);
    return () => {
      ro.disconnect();
      unwire();
      unDots();
    };
  },
};

export const layouts = [atelier];
