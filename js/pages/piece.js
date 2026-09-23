// Piece: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.
//
//   1 Atelier    straight gallery beside a sticky buying column
//
// The column, top to bottom: name, price, one line, what the two-piece is,
// size buttons with a "Size chart" that opens in the page, the dupatta add-on,
// the total, Add to bag (or Sold out) and WhatsApp, then short facts.
// Every image on this Page is a plain rectangle, as everywhere in round 2.
// A stand-in Piece (isSample) carries a quiet "Sample design" tag, and its
// Print is described as a sample Print idea, never as one of hers.

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

/** The next n Pieces after the current one, wrapping round the collection. */
function nextPieces(ctx, n) {
  const i = ctx.pieces.indexOf(ctx.piece);
  return Array.from({ length: n }, (_, k) => ctx.pieces[(i + 1 + k) % ctx.pieces.length]);
}

/** The Print swatch's file from the image resolver, for tiling as a fabric surface. */
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

function sizeChips(p) {
  return html`<div class="piece-sizes" role="radiogroup" aria-label="Size">
    ${SIZES.map(
      (s) => `<label class="piece-size"><input type="radio" name="size-${p.key}" value="${s}" data-size${p.soldOut ? ' disabled' : ''}><span>${s}</span></label>`,
    )}
  </div>`;
}

/** The size chart, folded into the buying column; opened by the "Size chart" button. */
const chartId = (p) => `piece-l1-chart-${p.key}`;

function chartPanel(p) {
  return html`<div class="piece-l1__chart" id="${chartId(p)}" data-chart hidden>
    <div class="piece-l1__chart-head">
      <p class="piece-l1__chart-title">Size chart <span class="s-meta">body measurements, inches</span></p>
      <button class="piece-l1__chart-close" type="button" data-chart-close aria-label="Close the size chart">Close</button>
    </div>
    ${sizeChart()}
    <p class="piece-l1__chart-note s-meta">Lengths are the finished kurta and shalwar.${SIZE_CHART.placeholder ? ' Placeholder figures until the final chart is in.' : ''} No custom sizing: between two sizes, ask us on WhatsApp.</p>
  </div>`;
}

/** Size, size chart, dupatta, total, Add to bag and WhatsApp. Wired up by wireBuying(). */
function buyForm(ctx, p) {
  return html`<form class="piece-buy${p.soldOut ? ' is-sold-out' : ''}" data-demo-form data-piece-buy>
    <div class="piece-buy__head">
      <p class="piece-buy__label">Size <span class="piece-buy__chosen" data-size-label></span></p>
      <button class="piece-buy__guide" type="button" data-chart-toggle aria-expanded="false" aria-controls="${chartId(p)}">Size chart</button>
    </div>
    ${sizeChips(p)}
    ${chartPanel(p)}

    <label class="piece-buy__dupatta${p.soldOut ? ' is-disabled' : ''}">
      <input type="checkbox" role="switch" data-dupatta${p.soldOut ? ' disabled' : ''}>
      <span class="piece-buy__switch" aria-hidden="true"></span>
      <span class="piece-buy__dupatta-text">
        <span>Add the matching dupatta (+${formatPKR(p.dupattaPrice)})</span>
        <span class="s-meta">${FABRIC.dupatta}, in the same Print. Sold only as an <span class="piece-buy__nowrap">add-on</span>.</span>
      </span>
    </label>

    <p class="piece-buy__total">
      <span class="piece-buy__total-label">Total <span class="s-meta" data-total-note>Two-piece</span></span>
      <span class="s-price" data-total>${formatPKR(p.price)}</span>
    </p>

    <div class="piece-buy__actions">
      <button class="s-btn piece-buy__add" type="submit"${p.soldOut ? ' disabled aria-disabled="true"' : ''}>${p.soldOut ? 'Sold out' : 'Add to bag'}</button>
      <a class="s-btn s-btn--quiet piece-buy__wa" href="${whatsappHref(ctx, p)}" target="_blank" rel="noopener" data-wa>${p.soldOut ? 'Ask on WhatsApp' : 'Order on WhatsApp'}</a>
    </div>
    <div class="piece-buy__status" data-buy-status aria-live="polite">${
      p.soldOut ? `<p class="s-meta">${p.name} has sold out: stock is limited. Message us on WhatsApp to hear if it comes back.</p>` : ''
    }</div>
  </form>`;
}

/** The Print, as the facts say it: hers are hand-painted; a stand-in's is a sample idea. */
const printText = (p) =>
  isSample(p)
    ? `A sample Print idea, standing in until the next designs are ready: ${p.print.charAt(0).toLowerCase()}${p.print.slice(1)}`
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
 * the size label, the marked chart row, the total and the WhatsApp message;
 * Add to bag puts that exact line in the bag and says what went in.
 */
function wireBuying(el, ctx, p) {
  let size = '';
  let dupatta = false;
  const all = (sel) => el.querySelectorAll(sel);
  const total = () => ctx.bag.unitPrice({ piece: p.key, dupatta });

  const sync = () => {
    all('[data-size]').forEach((input) => (input.checked = input.value === size));
    all('[data-size-label]').forEach((n) => (n.textContent = size ? `· ${size}` : ''));
    all('[data-dupatta]').forEach((n) => (n.checked = dupatta));
    all('[data-total]').forEach((n) => (n.textContent = formatPKR(total())));
    all('[data-total-note]').forEach((n) => (n.textContent = dupatta ? 'Two-piece and dupatta' : 'Two-piece'));
    all('[data-wa]').forEach((a) => (a.href = whatsappHref(ctx, p, size, dupatta)));
    all('[data-piece-buy]').forEach((f) => f.classList.remove('is-asking'));
    markSizeChartRow(el, size);
  };
  const status = (msg) => all('[data-buy-status]').forEach((n) => (n.innerHTML = msg));

  const setChart = (open, { focus = false } = {}) => {
    all('[data-chart]').forEach((c) => (c.hidden = !open));
    all('[data-chart-toggle]').forEach((b) => {
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? 'Hide size chart' : 'Size chart';
      if (focus) b.focus();
    });
  };

  const onChange = (e) => {
    if (e.target.matches('[data-dupatta]')) dupatta = e.target.checked;
    else if (e.target.matches('[data-size]')) size = e.target.value;
    else return;
    if (!p.soldOut) status('');
    sync();
  };
  const onClick = (e) => {
    const toggle = e.target.closest('[data-chart-toggle]');
    if (toggle) setChart(toggle.getAttribute('aria-expanded') !== 'true');
    else if (e.target.closest('[data-chart-close]')) setChart(false, { focus: true });
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && e.target.closest('[data-chart]')) setChart(false, { focus: true });
  };
  const onSubmit = (e) => {
    const form = e.target.closest('[data-piece-buy]');
    if (!form) return;
    e.preventDefault();
    if (!ctx.bag.canAdd(p.key)) return;
    if (!size) {
      form.classList.add('is-asking');
      status('<p class="s-meta piece-buy__ask">Please choose a size first.</p>');
      return;
    }
    if (!ctx.bag.add(p.key, size, 1, dupatta)) return;
    const what = dupatta ? 'with the matching dupatta' : 'without the dupatta';
    status(html`<div class="piece-l1__added" role="status">
      <p class="piece-l1__added-head">Added to your bag</p>
      <p class="piece-l1__added-line">${esc(p.name)} · Size ${size} · ${what}</p>
      <p class="piece-l1__added-foot"><span class="s-price">${formatPKR(total())}</span><a class="s-link" href="${ctx.href({ page: 'bag' })}">View bag</a></p>
    </div>`);
  };

  el.addEventListener('change', onChange);
  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKey);
  el.addEventListener('submit', onSubmit);
  sync();
  return () => {
    el.removeEventListener('change', onChange);
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onKey);
    el.removeEventListener('submit', onSubmit);
  };
}

/* ================= Layout 1 · Atelier ================= */
/* A straight gallery on the left, a sticky buying column on the right. */

const atelier = {
  name: 'Atelier',
  render(ctx) {
    const p = ctx.piece;

    return html`
      <section class="piece-l1__main">
        <div class="wrap piece-l1__grid">
          <div class="piece-l1__gallery">
            <figure class="piece-l1__lead">${media(ctx.pieceImg(p, 'front', { loading: 'eager', alt: `${p.name}, worn` }))}</figure>
            <figure class="piece-l1__shot">${media(ctx.pieceImg(p, 'detail', { loading: 'eager', alt: `${p.name}, close up` }))}<figcaption class="s-caption">Close up</figcaption></figure>
            <figure class="piece-l1__cloth">
              <div class="piece-l1__cloth-tile" style="${printTile(ctx, p)}" role="img" aria-label="The ${p.name} Print"></div>
              <figcaption class="s-caption">${isSample(p) ? 'A sample Print idea' : 'The Print'}, on ${p.groundLabel.toLowerCase()}</figcaption>
            </figure>
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
            <p class="piece-l1__kind">
              <span class="piece-l1__kind-tag">Two-piece</span>
              <span class="s-meta">A short kurta and ${trouserName(p)}, both in ${FABRIC.kurta.toLowerCase()}.</span>
            </p>
            ${buyForm(ctx, p)}
            ${facts(p)}
          </div>
        </div>
      </section>

      <section class="piece-l1__more s-field">
        <div class="wrap">
          ${sectionHead({
            title: 'More Pieces',
            link: `<a class="s-link" href="${ctx.href({ page: 'collection' })}">View all</a>`,
          })}
          <div class="piece-l1__grid-more">${nextPieces(ctx, 4).map((q) => pieceCard(q, ctx))}</div>
        </div>
      </section>`;
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
    return () => {
      ro.disconnect();
      unwire();
    };
  },
};

export const layouts = [atelier];
