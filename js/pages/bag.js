// Bag and checkout: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, enter?(ctx), render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.
//
// Nothing is submitted. "Place order" checks the required fields first, then
// swaps the page for an in-page confirmation, which stays while the reviewer
// switches Name or Frame and is forgotten once they leave the Bag page.
//
// An empty bag shows the empty-bag design. The example bag is only ever added
// from its "Fill example bag" button, never on arrival.
//
// Payment follows the country: no method is offered until a country is chosen,
// and cash on delivery is Pakistan only (paymentFor in js/pieces.js).
//
// On phones a bar stays at the bottom of the screen: "Checkout · PKR x" while
// the pieces are in view, then "Place order · PKR x" once the form is, and it
// steps aside when the real Place order button is on screen.

import { html, esc, media } from '../ui.js';
import {
  formatPKR, pieceByKey, pieceContents, whatsappLink, deliveryFee, paymentFor,
  DELIVERY, DISPATCH, PAYMENT, BANK_DETAILS, EXCHANGES, FABRIC,
} from '../pieces.js';
import { MAX_QTY } from '../bag-store.js';
import { current } from '../state.js';

// [piece, size, qty, dupatta]
const EXAMPLE_BAG = [
  ['posy', 'M', 1, true],
  ['buttercup', 'S', 1, false],
];

// The hand-painted bow from round 3's motifs (ticket 01). It shows only once the
// file has loaded, so the empty bag and the confirmation work without it.
// TODO: read it from js/images.js once that exports the motifs.
const MOTIF = 'assets/motifs/bow.webp';

const REGIONS = DELIVERY.regions;
const regionPrice = (r) => `${formatPKR(r.fee)}${r.usd ? ` (about USD ${r.usd})` : ''}`;

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar',
  'Quetta', 'Sialkot', 'Hyderabad', 'Gujranwala', 'Abbottabad', 'Another city or town',
];

const whatsapp = (ctx) => whatsappLink(ctx.brand.hello('I have a question about my order.'));
const receiptLink = (ctx, number) =>
  whatsappLink(ctx.brand.hello(`here is my bank transfer receipt for order ${number}.`));

// The placed order, kept while the reviewer stays on this Page.
let order = null;
// Whether the motif file loaded (null until the first try).
let motifReady = null;

/* ---------- Helpers ---------- */

const pieceWord = (n) => (n === 1 ? 'piece' : 'pieces');

function lines(ctx) {
  return ctx.bag.list().map((item, index) => {
    const piece = pieceByKey(item.piece);
    return { ...item, index, piece, unit: ctx.bag.unitPrice(item), total: ctx.bag.lineTotal(item) };
  });
}

/** The bag's totals from the bag store; `region` is the chosen country ('' before a choice, so no delivery yet). */
function totals(ctx, region = '') {
  const subtotal = ctx.bag.subtotal();
  const delivery = deliveryFee(region) ?? 0;
  return { subtotal, delivery, total: subtotal + delivery, count: ctx.bag.count() };
}

const whatsappIcon = `<svg class="bag-l1__wa-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 19.8 5.3 16A8.2 8.2 0 1 1 8.4 19z"/><path d="M9.2 8.6c.2-.5.6-.6.9-.5l.9 1.9-.6.8c.5 1.1 1.4 2 2.5 2.5l.8-.6 1.9.9c.1.3 0 .7-.5.9-1.9 1-6.5-2.9-5.9-5.9z"/></svg>`;

function blockHead(num, title, aside = '') {
  return html`<header class="bag-l1__block-head">
    ${num && `<span class="bag-l1__num">${num}</span>`}
    <h2 class="bag-l1__block-title">${title}</h2>
    ${aside && `<span class="bag-l1__block-aside s-meta">${aside}</span>`}
  </header>`;
}

const motifSlot = () => '<div class="bag-l1__motif" data-motif aria-hidden="true"></div>';

/* ---------- Line items ---------- */

const contentsLine = (piece) =>
  `${pieceContents(piece).map((c, i) => (i ? c.item.toLowerCase() : c.item)).join(' and ')}, ${FABRIC.kurta.toLowerCase()}`;

function itemsHtml(ctx, items) {
  return items.map(
    (l) => html`<li class="bag-l1__item">
      <a class="bag-l1__thumb" href="${ctx.href({ page: 'piece', piece: l.piece.key })}" aria-label="${l.piece.name}">
        ${media(ctx.pieceImg(l.piece, 'front', { alt: `${l.piece.name}, front`, loading: 'eager' }), { ratio: 'portrait' })}
      </a>
      <div class="bag-l1__item-text">
        <p class="bag-l1__item-name s-title">
          <a href="${ctx.href({ page: 'piece', piece: l.piece.key })}">${l.piece.name}</a>
        </p>
        <p class="s-meta">${l.piece.groundLabel}. ${contentsLine(l.piece)}</p>
        <p class="bag-l1__item-size s-meta">Size <span>${esc(l.size)}</span></p>
        ${l.dupatta
          ? html`<p class="bag-l1__addon s-meta">With the matching ${FABRIC.dupatta.toLowerCase()} dupatta <span>${formatPKR(l.piece.dupattaPrice)}</span></p>`
          : '<p class="bag-l1__no-addon s-meta">No dupatta</p>'}
        <button class="bag-l1__remove" type="button" data-remove="${l.index}">Remove</button>
      </div>
      <div class="bag-l1__qty" role="group" aria-label="Quantity of ${l.piece.name}">
        <button type="button" data-qty="${l.index}" data-step="-1" aria-label="One fewer">−</button>
        <span aria-live="polite">${l.qty}</span>
        <button type="button" data-qty="${l.index}" data-step="1" aria-label="One more"${l.qty >= MAX_QTY ? ' disabled' : ''}>+</button>
      </div>
      <p class="bag-l1__item-price">
        <span class="s-price">${formatPKR(l.total)}</span>
        ${l.qty > 1 && `<span class="bag-l1__each s-meta">${formatPKR(l.unit)} each</span>`}
      </p>
    </li>`
  );
}

/* ---------- Summary: the one place the total is read out ---------- */

function summaryHtml(ctx, region) {
  const t = totals(ctx, region);
  const r = REGIONS[region];
  return html`
    <h2 class="bag-l1__summary-title">Order summary</h2>
    <dl class="bag-l1__sums">
      <div><dt>Subtotal <span class="bag-l1__sums-meta">· ${t.count} ${pieceWord(t.count)}</span></dt><dd class="s-price">${formatPKR(t.subtotal)}</dd></div>
      <div data-delivery-line>
        <dt>Delivery${r ? ` <span class="bag-l1__sums-meta">· ${r.label}</span>` : ''}</dt>
        <dd class="${r ? 's-price' : 'bag-l1__pending'}">${r ? regionPrice(r) : 'Choose your country below'}</dd>
      </div>
    </dl>
    <div class="bag-l1__total">
      <span class="bag-l1__total-label">Total</span>
      <span class="bag-l1__total-sum">${formatPKR(t.total)}</span>
    </div>
    <p class="bag-l1__fact s-meta">Dispatched in ${DISPATCH.days} · ${EXCHANGES.short.toLowerCase()}</p>`;
}

/* ---------- Form ---------- */

/** A labelled field with its inline error. `name` ties the error to the input. */
function field(label, input, { name, full = false, optional = false } = {}) {
  return html`<label class="bag-l1__field${full ? ' bag-l1__field--full' : ''}" data-field="${name}">
    <span class="bag-l1__label">${label}${optional && ' <span class="bag-l1__optional">optional</span>'}</span>
    ${input}
    <span class="bag-l1__error" id="bag-err-${name}" data-error-for="${name}" hidden></span>
  </label>`;
}

const input = (name, attrs) => `<input name="${name}" aria-describedby="bag-err-${name}" ${attrs}>`;

function option(name, value, title, note, price) {
  return html`<label class="bag-l1__option" data-option="${value}">
    <input type="radio" name="${name}" value="${value}">
    <span class="bag-l1__option-body">
      <span class="bag-l1__option-title">${title}</span>
      <span class="s-meta">${note}</span>
    </span>
    ${price && `<span class="bag-l1__option-price s-price">${price}</span>`}
  </label>`;
}

/** The address fields, shaped for the chosen country (Pakistan's before a choice). */
function detailsHtml(region) {
  const abroad = region === 'international';
  const phone = abroad
    ? input('phone', 'type="tel" inputmode="tel" autocomplete="tel" placeholder="With the country code"')
    : `<span class="bag-l1__prefixed"><span class="bag-l1__prefix">+92</span>${input('phone', 'type="tel" inputmode="tel" autocomplete="tel-national" placeholder="3XX XXXXXXX"')}</span>`;
  const place = abroad
    ? [
        field('Country', input('country', 'autocomplete="country-name" placeholder="For example, United Kingdom"'), { name: 'country', full: true }),
        field('City or town', input('city', 'autocomplete="address-level2" placeholder="City or town"'), { name: 'city' }),
        field('Postcode', input('postcode', 'autocomplete="postal-code" placeholder="Postcode or ZIP"'), { name: 'postcode', optional: true }),
      ]
    : [
        field(
          'City',
          `<span class="bag-l1__select"><select name="city" autocomplete="address-level2" aria-describedby="bag-err-city">
            <option value="" selected>Choose your city</option>
            ${CITIES.map((c) => `<option>${c}</option>`).join('')}
          </select></span>`,
          { name: 'city' }
        ),
        field('Postcode', input('postcode', 'inputmode="numeric" autocomplete="postal-code" placeholder="54000"'), { name: 'postcode', optional: true }),
      ];
  return [
    field('Full name', input('name', 'autocomplete="name" placeholder="As it should read on the parcel"'), { name: 'name', full: true }),
    field('Mobile number', phone, { name: 'phone' }),
    field('Email', input('email', 'type="email" autocomplete="email" placeholder="For your receipt"'), { name: 'email', optional: true }),
    field('Address', input('address', 'autocomplete="street-address" placeholder="House, street and area"'), { name: 'address', full: true }),
    ...place,
  ].join('');
}

/** Required fields and what to say when one is missing. Each returns '' when the value is fine. */
const RULES = {
  name: (v) => (v.length >= 2 ? '' : 'Enter your full name.'),
  phone: (v, region) => {
    let d = v.replace(/\D/g, '');
    if (region === 'international') return d.length >= 7 && d.length <= 15 ? '' : 'Enter your mobile number with the country code.';
    d = d.replace(/^(92|0)/, '');
    return /^3\d{9}$/.test(d) ? '' : 'Enter your mobile number, for example 300 1234567.';
  },
  address: (v) => (v.length >= 4 ? '' : 'Enter your house, street and area.'),
  city: (v, region) => (v ? '' : region === 'international' ? 'Enter your city or town.' : 'Choose your city.'),
  country: (v, region) => (region !== 'international' || v ? '' : 'Enter the country we are delivering to.'),
};

/** The placeholder bank details; with an order number, the note to send the receipt. */
function bankHtml(ctx, number = '') {
  return html`<div class="bag-l1__bank">
    <div class="bag-l1__bank-head">
      <p class="bag-l1__bank-title">Bank details</p>
      <span class="bag-l1__tag">Placeholder</span>
    </div>
    <dl class="bag-l1__bank-details">
      <div><dt>Bank</dt><dd>${BANK_DETAILS.bank}</dd></div>
      <div><dt>Account title</dt><dd>${BANK_DETAILS.title}</dd></div>
      <div><dt>Account number</dt><dd>${BANK_DETAILS.account}</dd></div>
      <div><dt>IBAN</dt><dd>${BANK_DETAILS.iban}</dd></div>
    </dl>
  </div>
  ${number &&
  html`<div class="bag-l1__receipt-note">
    ${whatsappIcon}
    <div>
      <p class="s-body">Send the receipt on WhatsApp with your order number, <strong>${number}</strong>. We dispatch once it clears.</p>
      <a class="s-link" href="${receiptLink(ctx, number)}" target="_blank" rel="noopener">Send the receipt on WhatsApp</a>
    </div>
  </div>`}`;
}

const STEPS = [
  ['bag-country', '01', 'Country'],
  ['bag-payment', '02', 'Payment'],
  ['bag-place', '03', 'Place order'],
];

/** The three steps, with the one in view marked. Shown in the sticky summary column on
 *  desktop and as a strip under the header on smaller screens (one of the two is hidden). */
const stepsHtml = (cls) => html`<nav class="bag-l1__steps ${cls}" aria-label="Checkout steps"><ol>
  ${STEPS.map(
    ([id, num, label], i) => html`<li><button type="button" data-goto="${id}"${i === 0 ? ' class="is-current" aria-current="step"' : ''}><span>${num}</span>${label}</button></li>`
  )}
</ol></nav>`;

function checkoutView(ctx) {
  const items = lines(ctx);
  const t = totals(ctx);
  return html`
    <header class="wrap bag-l1__head">
      <h1 class="bag-l1__title">Your bag <span class="bag-l1__count" data-bag-count-label>${t.count} ${pieceWord(t.count)}</span></h1>
    </header>
    ${stepsHtml('bag-l1__steps--strip')}

    <div class="wrap bag-l1__grid">
        <section class="bag-l1__bag" id="bag-items" aria-label="Your pieces">
          <ul class="bag-l1__items" data-bag-items>${itemsHtml(ctx, items)}</ul>
          <a class="s-link bag-l1__continue" href="${ctx.href({ page: 'collection' })}">Continue shopping</a>
        </section>

        <aside class="bag-l1__aside">
          ${stepsHtml('bag-l1__steps--aside')}
          <div class="bag-l1__summary s-field s-field--soft" data-bag-summary>${summaryHtml(ctx, '')}</div>
        </aside>

        <form class="bag-l1__form" data-demo-form data-bag-form data-pay="" novalidate>
          <section class="bag-l1__block" id="bag-country" data-checkout-step>
            ${blockHead('01', 'Country')}
            <fieldset class="bag-l1__options" data-field="ship">
              <legend class="bag-l1__label">Where are we delivering to?</legend>
              ${Object.values(REGIONS).map((r) => option('ship', r.key, r.label, r.note, regionPrice(r)))}
            </fieldset>
            <p class="bag-l1__error" data-error-for="ship" role="alert" hidden></p>
            <p class="bag-l1__fine s-meta">Delivery charges are placeholders for now.</p>

            <p class="bag-l1__label bag-l1__sub">Delivery details</p>
            <div class="bag-l1__fields" data-bag-details>${detailsHtml('')}</div>
          </section>

          <section class="bag-l1__block" id="bag-payment" data-checkout-step>
            ${blockHead('02', 'Payment')}
            <fieldset class="bag-l1__options" data-field="pay" disabled>
              <legend class="bag-l1__label">Pay with</legend>
              ${PAYMENT.map((m) => option('pay', m.key, m.label, m.note, ''))}
            </fieldset>
            <p class="bag-l1__fine s-meta" data-pay-first>Choose your country first: how you can pay depends on it.</p>
            <p class="bag-l1__fine s-meta" data-pay-abroad hidden>Cash on delivery is for Pakistan only, so orders outside Pakistan are paid by bank transfer.</p>
            <p class="bag-l1__error" data-error-for="pay" role="alert" hidden></p>

            <div class="bag-l1__panel" data-pay-panel="bank">
              <p class="s-body">Transfer the total to this account once you have placed your order.</p>
              ${bankHtml(ctx)}
            </div>
          </section>

          <section class="bag-l1__block bag-l1__place" id="bag-place" data-checkout-step>
            ${blockHead('03', 'Place order')}
            <p class="bag-l1__alert" data-form-alert role="alert" hidden></p>
            <button class="s-btn bag-l1__submit" type="submit" data-submit>Place order <span class="bag-l1__submit-sep" aria-hidden="true"></span><span data-submit-total>${formatPKR(t.total)}</span></button>

            <div class="bag-l1__help">
              ${whatsappIcon}
              <div>
                <p class="bag-l1__help-title">Questions?</p>
                <p class="s-meta">Ask us anything on WhatsApp. We can also take your order there.</p>
                <a class="s-link" href="${whatsapp(ctx)}" target="_blank" rel="noopener">Message us on WhatsApp</a>
              </div>
            </div>
          </section>
        </form>
    </div>

    <div class="bag-l1__bar" data-bag-bar>
      <button class="s-btn bag-l1__bar-btn" type="button" data-bar-action>
        <span data-bar-label>Checkout</span><span aria-hidden="true">·</span><span data-bar-total>${formatPKR(t.total)}</span>
      </button>
    </div>`;
}

function emptyView(ctx) {
  return html`
    <section class="wrap bag-l1__empty">
      ${motifSlot()}
      <h1 class="s-display s-display--m bag-l1__empty-title">Your bag is empty</h1>
      <p class="s-body bag-l1__empty-line">Nothing in here yet. The first pieces are waiting in the collection.</p>
      <div class="bag-l1__empty-actions">
        <a class="s-btn" href="${ctx.href({ page: 'collection' })}">Shop the collection</a>
        <button class="s-btn s-btn--quiet" type="button" data-fill-example>Fill example bag</button>
      </div>
      <p class="s-meta bag-l1__empty-note">For this preview: the example bag adds two pieces so you can try checkout.</p>
    </section>`;
}

function confirmationView(ctx, o) {
  const first = o.name.split(/\s+/)[0];
  const t = o.totals;
  const r = REGIONS[o.ship];
  const steps = [
    ['Confirmed', 'Today'],
    ['Dispatched', `In ${DISPATCH.days}`],
    ['On its way', 'We will message you on WhatsApp when it ships'],
  ];
  return html`
    <section class="wrap bag-l1__done-head">
      ${motifSlot()}
      <p class="bag-l1__order-no">Order no. ${o.number}</p>
      <h1 class="s-display s-display--m bag-l1__empty-title">${first ? `Thank you, ${esc(first)}` : 'Thank you'}</h1>
      <p class="s-lede bag-l1__lede">${
        o.pay === 'bank'
          ? html`Your order is in. Transfer the total, then send the receipt on WhatsApp with your order number, <strong>${o.number}</strong>.`
          : 'Your order is confirmed. We will message you on WhatsApp when it ships.'
      }</p>
    </section>

    <div class="wrap bag-l1__receipt">
      <ol class="bag-l1__timeline">
        ${steps.map(
          ([title, when], i) => html`<li${i === 0 ? ' class="is-done"' : ''}>
            <span class="bag-l1__timeline-dot" aria-hidden="true"></span>
            <span class="bag-l1__timeline-title">${title}</span>
            <span class="s-meta">${when}</span>
          </li>`
        )}
      </ol>

      <div class="bag-l1__receipt-grid">
        <section>
          ${blockHead('', 'Your pieces', `${t.count} ${pieceWord(t.count)}`)}
          <ul class="bag-l1__items bag-l1__items--receipt">
            ${o.items.map(
              (l) => html`<li class="bag-l1__item">
                <a class="bag-l1__thumb" href="${ctx.href({ page: 'piece', piece: l.piece.key })}" aria-label="${l.piece.name}">
                  ${media(ctx.pieceImg(l.piece, 'front', { alt: `${l.piece.name}, front`, loading: 'eager' }), { ratio: 'portrait' })}
                </a>
                <div class="bag-l1__item-text">
                  <p class="bag-l1__item-name s-title">${l.piece.name}</p>
                  <p class="bag-l1__item-size s-meta">Size <span>${esc(l.size)}</span>${l.dupatta ? ' · with the matching dupatta' : ' · no dupatta'}${l.qty > 1 ? ` · ×${l.qty}` : ''}</p>
                </div>
                <p class="bag-l1__item-price s-price">${formatPKR(l.total)}</p>
              </li>`
            )}
          </ul>
        </section>

        <section class="bag-l1__details s-field s-field--soft">
          <dl>
            <div><dt>Delivering to</dt><dd>${o.address ? esc(o.address) + '<br>' : ''}${esc([o.city, o.ship === 'international' ? o.country : 'Pakistan'].filter(Boolean).join(', '))}</dd></div>
            <div><dt>Delivery</dt><dd>${r ? `${r.label}, ${regionPrice(r)}` : ''}</dd></div>
            <div><dt>Payment</dt><dd>${o.pay === 'bank' ? 'Bank transfer' : 'Cash on delivery'}</dd></div>
          </dl>
          <div class="bag-l1__total">
            <span class="bag-l1__total-label">Total</span>
            <span class="bag-l1__total-sum">${formatPKR(t.total)}</span>
          </div>
        </section>
      </div>

      ${o.pay === 'bank' &&
      html`<section class="bag-l1__receipt-bank">
        ${blockHead('', 'Pay by bank transfer')}
        ${bankHtml(ctx, o.number)}
      </section>`}

      <div class="bag-l1__after">
        <a class="s-btn" href="${ctx.href({ page: 'collection' })}" data-new-order>Continue browsing</a>
        <a class="s-link" href="${whatsapp(ctx)}" target="_blank" rel="noopener">Questions? Message us on WhatsApp</a>
      </div>
    </div>`;
}

function viewKind(ctx) {
  if (order) return 'done';
  return ctx.bag.count() ? 'checkout' : 'empty';
}

function view(ctx, kind) {
  if (kind === 'done') return confirmationView(ctx, order);
  if (kind === 'empty') return emptyView(ctx);
  return checkoutView(ctx);
}

/* ---------- Layout 1 · Atelier checkout ---------- */

const atelier = {
  name: 'Atelier checkout',

  render(ctx) {
    const kind = viewKind(ctx);
    return `<div class="bag-l1__root" data-bag-root data-view="${kind}">${view(ctx, kind)}</div>`;
  },

  mount(el, ctx) {
    const root = el.querySelector('[data-bag-root]');
    const scroller = el.closest('.site-scroll');
    const form = () => root.querySelector('[data-bag-form]');
    const ship = () => form()?.elements.ship?.value ?? '';
    const pay = () => form()?.elements.pay?.value ?? '';

    // The motif shows only once its file has loaded: a detached probe, so a
    // missing file never shows a broken image or an error.
    const placeMotif = () => {
      const slots = root.querySelectorAll('[data-motif]');
      if (!slots.length || motifReady === false) return;
      const fill = () => slots.forEach((s) => (s.innerHTML = `<img src="${MOTIF}" alt="" width="96" height="96" decoding="async">`));
      if (motifReady) return fill();
      const probe = new Image();
      probe.onload = () => ((motifReady = true), root.isConnected && root.querySelectorAll('[data-motif]').forEach((s) => (s.innerHTML ||= `<img src="${MOTIF}" alt="" width="96" height="96" decoding="async">`)));
      probe.onerror = () => (motifReady = false);
      probe.src = MOTIF;
    };

    /* ----- Totals: the summary, the Place order button and the phone bar ----- */

    const repaintTotals = () => {
      const region = ship();
      const t = totals(ctx, region);
      root.querySelector('[data-bag-summary]').innerHTML = summaryHtml(ctx, region);
      root.querySelectorAll('[data-submit-total], [data-bar-total]').forEach((n) => (n.textContent = formatPKR(t.total)));
    };

    /* ----- Inline errors ----- */

    const showError = (name, message) => {
      const f = form();
      const box = f.querySelector(`[data-error-for="${name}"]`);
      if (box) {
        box.textContent = message;
        box.hidden = !message;
      }
      f.querySelector(`[data-field="${name}"]`)?.classList.toggle('is-invalid', !!message);
      f.querySelectorAll(`[name="${name}"]`).forEach((n) => n.setAttribute('aria-invalid', message ? 'true' : 'false'));
    };

    const checkField = (name) => {
      const f = form();
      const node = f.elements.namedItem(name);
      if (!node || !RULES[name]) return '';
      const message = RULES[name](node.value.trim(), ship());
      showError(name, message);
      return message;
    };

    // Everything Place order needs, in page order. Returns the names that failed.
    const validate = () => {
      const failed = [];
      if (!REGIONS[ship()]) {
        showError('ship', 'Choose where we are delivering to.');
        failed.push('ship');
      } else showError('ship', '');
      for (const name of Object.keys(RULES)) if (checkField(name)) failed.push(name);
      if (REGIONS[ship()] && !pay()) {
        showError('pay', 'Choose how you would like to pay.');
        failed.push('pay');
      } else showError('pay', '');
      return failed;
    };

    const ORDER = ['ship', 'name', 'phone', 'address', 'country', 'city', 'pay'];

    // The note by Place order says how many details are still missing, or goes away.
    const sayMissing = (failed) => {
      const alert = root.querySelector('[data-form-alert]');
      const n = failed.length;
      alert.hidden = !n;
      alert.textContent = n
        ? `${n === 1 ? 'One detail is' : `${n} details are`} missing. ${n === 1 ? 'It is' : 'They are'} marked above.`
        : '';
    };
    const recheck = () => form()?.dataset.tried && sayMissing(validate());

    /* ----- Country reshapes the address fields and the payment choices ----- */

    const KEEP = ['name', 'phone', 'email', 'address'];
    const repaintDetails = () => {
      const box = root.querySelector('[data-bag-details]');
      const kept = {};
      box.querySelectorAll('input').forEach((f) => KEEP.includes(f.name) && (kept[f.name] = f.value));
      box.innerHTML = detailsHtml(ship());
      box.querySelectorAll('input').forEach((f) => kept[f.name] && (f.value = kept[f.name]));
      // After a first try, keep showing what is still missing.
      if (form().dataset.tried) Object.keys(RULES).forEach(checkField);
    };

    // Nothing is offered before a country; then only that country's methods,
    // chosen for the shopper only when there is just one.
    const syncPayment = () => {
      const f = form();
      const region = ship();
      const offered = paymentFor(region).map((m) => m.key);
      f.querySelector('[data-field="pay"]').disabled = !region;
      f.querySelectorAll('[name="pay"]').forEach((input) => {
        const on = offered.includes(input.value);
        input.disabled = !on;
        input.closest('[data-option]').hidden = !on;
        if (!on) input.checked = false;
      });
      if (region && offered.length === 1) f.querySelector(`[name="pay"][value="${offered[0]}"]`).checked = true;
      f.dataset.pay = pay();
      root.querySelector('[data-pay-first]').hidden = !!region;
      root.querySelector('[data-pay-abroad]').hidden = !region || offered.length === PAYMENT.length;
      if (pay()) showError('pay', '');
    };

    /* ----- Where the shopper is: the current step and the phone bar ----- */

    const viewport = () => {
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
        const r = scroller.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }
      return { top: 0, bottom: window.innerHeight };
    };

    let frame = 0;
    const track = () => {
      frame = 0;
      if (root.dataset.view !== 'checkout') return;
      const v = viewport();
      const h = v.bottom - v.top;
      const sections = [...root.querySelectorAll('[data-checkout-step]')];
      let currentId = sections[0]?.id;
      sections.forEach((s) => {
        if (s.getBoundingClientRect().top - v.top < h * 0.45) currentId = s.id;
      });
      root.querySelectorAll('[data-goto]').forEach((b) => {
        const on = b.dataset.goto === currentId;
        b.classList.toggle('is-current', on);
        if (on) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });

      const bar = root.querySelector('[data-bag-bar]');
      const country = root.querySelector('#bag-country');
      const submit = root.querySelector('[data-submit]');
      if (!bar || !country || !submit) return;
      const inForm = country.getBoundingClientRect().top - v.top < h * 0.6;
      const s = submit.getBoundingClientRect();
      const submitVisible = s.top < v.bottom && s.bottom > v.top;
      bar.dataset.mode = inForm ? 'place' : 'checkout';
      bar.querySelector('[data-bar-label]').textContent = inForm ? 'Place order' : 'Checkout';
      bar.classList.toggle('is-away', submitVisible);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(track);
    };

    /* ----- Repaint when the bag changes ----- */

    const paint = () => {
      const kind = viewKind(ctx);
      if (kind !== root.dataset.view) {
        root.dataset.view = kind;
        root.innerHTML = view(ctx, kind);
        scroller?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
        placeMotif();
        track();
        return;
      }
      if (kind !== 'checkout') return;
      const t = totals(ctx);
      root.querySelector('[data-bag-items]').innerHTML = itemsHtml(ctx, lines(ctx)).join('');
      root.querySelector('[data-bag-count-label]').textContent = `${t.count} ${pieceWord(t.count)}`;
      repaintTotals();
    };

    const scrollToId = (id) => root.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const onClick = (e) => {
      const qtyBtn = e.target.closest('[data-qty]');
      if (qtyBtn) {
        const i = +qtyBtn.dataset.qty;
        const line = ctx.bag.list()[i];
        if (line) ctx.bag.setQty(i, line.qty + +qtyBtn.dataset.step);
        return;
      }
      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) {
        ctx.bag.remove(+removeBtn.dataset.remove);
        return;
      }
      const stepLink = e.target.closest('[data-goto]');
      if (stepLink) {
        scrollToId(stepLink.dataset.goto);
        return;
      }
      if (e.target.closest('[data-fill-example]')) {
        EXAMPLE_BAG.forEach(([piece, size, qty, dupatta]) => ctx.bag.add(piece, size, qty, dupatta));
        return;
      }
      const barBtn = e.target.closest('[data-bar-action]');
      if (barBtn) {
        if (barBtn.closest('[data-bag-bar]').dataset.mode === 'place') form().requestSubmit();
        else scrollToId('bag-country');
        return;
      }
      if (e.target.closest('[data-new-order]')) order = null;
    };

    const onChange = (e) => {
      if (e.target.name === 'ship') {
        showError('ship', '');
        repaintDetails();
        syncPayment();
        repaintTotals();
        recheck();
        return;
      }
      if (e.target.name === 'pay') {
        form().dataset.pay = e.target.value;
        showError('pay', '');
        recheck();
        return;
      }
      recheck();
    };

    // Once a field has shown an error, it clears as soon as the value is fine.
    const onInput = (e) => {
      const name = e.target.name;
      if (!RULES[name] || !form()?.querySelector(`[data-field="${name}"].is-invalid`)) return;
      recheck();
    };

    // A demo: nothing is sent anywhere. The fields are checked first.
    const onSubmit = (e) => {
      if (!e.target.matches('[data-bag-form]')) return;
      e.preventDefault();
      const f = e.target;
      f.dataset.tried = '1';
      const val = (n) => f.elements.namedItem(n)?.value?.trim() ?? '';
      const items = lines(ctx);
      if (!items.length) return;
      const failed = validate();
      sayMissing(failed);
      if (failed.length) {
        const first = ORDER.find((name) => failed.includes(name));
        const target = f.querySelector(`[data-field="${first}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = first === 'ship' || first === 'pay' ? null : f.elements.namedItem(first);
        focusable?.focus({ preventScroll: true });
        return;
      }
      order = {
        number: String(1000 + (Date.now() % 9000)),
        name: val('name'),
        address: val('address'),
        city: val('city'),
        country: val('country'),
        ship: val('ship'),
        pay: val('pay'),
        items,
        totals: totals(ctx, val('ship')), // before the bag is cleared
      };
      ctx.bag.clear(); // repaints through the subscription below
    };

    const unsubscribe = ctx.bag.subscribe(paint);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    root.addEventListener('submit', onSubmit);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);
    placeMotif();
    track();

    return () => {
      unsubscribe();
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('input', onInput);
      root.removeEventListener('submit', onSubmit);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      // Keep the confirmation across Name/Frame switches; forget it once the reviewer leaves.
      if (current().page !== 'bag') order = null;
    };
  },
};

export const layouts = [atelier];
