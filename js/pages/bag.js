// Bag and checkout: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, enter?(ctx), render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.
//
// Nothing is submitted. "Place order" swaps the page for an in-page
// confirmation, which stays while the reviewer switches Name or Frame and
// is forgotten once they leave the Bag page. A bag that is empty when the
// reviewer arrives on the Page is filled with an example (in enter(), never
// during render) so the design can always be judged.
//
// Payment follows the country: cash on delivery is Pakistan only, so outside
// Pakistan only bank transfer is offered (paymentFor in js/pieces.js).

import { html, esc, media } from '../ui.js';
import {
  formatPKR, pieceByKey, pieceContents, whatsappLink, deliveryFee, paymentFor, paymentText,
  DELIVERY, DISPATCH, PAYMENT, BANK_DETAILS, EXCHANGES, FABRIC,
} from '../pieces.js';
import { MAX_QTY } from '../bag-store.js';
import { current } from '../state.js';

// [piece, size, qty, dupatta]
const EXAMPLE_BAG = [
  ['posy', 'M', 1, true],
  ['buttercup', 'S', 1, false],
];

const REGIONS = DELIVERY.regions;
const regionPrice = (r) => `${formatPKR(r.fee)}${r.usd ? ` (about USD ${r.usd})` : ''}`;

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar',
  'Quetta', 'Sialkot', 'Hyderabad', 'Gujranwala', 'Abbottabad', 'Another city or town',
];

const whatsapp = (ctx) => whatsappLink(ctx.brand.hello('I have a question about my order.'));
const receiptLink = (ctx, number = '') =>
  whatsappLink(ctx.brand.hello(`here is my bank transfer receipt${number ? ` for order ${number}` : ''}.`));

// The placed order, kept while the reviewer stays on this Page.
let order = null;

/* ---------- Helpers ---------- */

const pieceWord = (n) => (n === 1 ? 'Piece' : 'Pieces');

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

/** What to pay: the total once a country is chosen, the subtotal "plus delivery" before. */
function payLine(t, region) {
  return REGIONS[region] ? formatPKR(t.total) : `${formatPKR(t.subtotal)} plus delivery`;
}

const whatsappIcon = `<svg class="bag-l1__wa-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 19.8 5.3 16A8.2 8.2 0 1 1 8.4 19z"/><path d="M9.2 8.6c.2-.5.6-.6.9-.5l.9 1.9-.6.8c.5 1.1 1.4 2 2.5 2.5l.8-.6 1.9.9c.1.3 0 .7-.5.9-1.9 1-6.5-2.9-5.9-5.9z"/></svg>`;

function blockHead(num, title, aside = '') {
  return html`<header class="bag-l1__block-head">
    <span class="bag-l1__num">${num}</span>
    <h2 class="bag-l1__block-title">${title}</h2>
    ${aside && `<span class="bag-l1__block-aside s-meta">${aside}</span>`}
  </header>`;
}

/* ---------- Views ---------- */

function intro({ eyebrow = '', title, lede = '', steps = false, center = false }) {
  return html`<section class="bag-l1__intro s-field${center ? ' bag-l1__intro--center' : ''}">
    <div class="wrap bag-l1__intro-inner">
      <div class="bag-l1__intro-text">
        ${eyebrow && `<p class="s-eyebrow">${eyebrow}</p>`}
        <h1 class="s-display s-display--l bag-l1__title">${title}</h1>
        ${lede && `<p class="s-lede bag-l1__lede">${lede}</p>`}
      </div>
      ${steps &&
      html`<ol class="bag-l1__steps" aria-label="Checkout steps">
        <li><button type="button" data-goto="bag-country"><span>01</span>Country</button></li>
        <li><button type="button" data-goto="bag-payment"><span>02</span>Payment</button></li>
        <li><button type="button" data-goto="bag-place"><span>03</span>Place order</button></li>
      </ol>`}
    </div>
  </section>`;
}

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

function summaryHtml(ctx, items, region) {
  const t = totals(ctx, region);
  const r = REGIONS[region];
  return html`
    <div class="bag-l1__summary-head">
      <p class="s-eyebrow">Order summary</p>
    </div>
    <ul class="bag-l1__mini">
      ${items.map(
        (l) => html`<li>
          <span>${l.piece.name} <span class="bag-l1__mini-meta">· ${esc(l.size)}${l.dupatta ? ' · + dupatta' : ''}${l.qty > 1 ? ` · ×${l.qty}` : ''}</span></span>
          <span class="s-price">${formatPKR(l.total)}</span>
        </li>`
      )}
    </ul>
    <dl class="bag-l1__sums">
      <div><dt>Subtotal</dt><dd class="s-price">${formatPKR(t.subtotal)}</dd></div>
      <div data-delivery-line>
        <dt>Delivery${r ? ` <span class="bag-l1__sums-meta">· ${r.label}</span>` : ''}</dt>
        <dd class="${r ? 's-price' : 'bag-l1__pending'}">${r ? regionPrice(r) : 'Calculated at checkout'}</dd>
      </div>
    </dl>
    <div class="bag-l1__total">
      <span class="bag-l1__total-label">Total</span>
      <span class="bag-l1__total-sum">${formatPKR(t.total)}</span>
    </div>
    <p class="bag-l1__currency s-meta">${r ? 'Prices in PKR, delivery included.' : 'Prices in PKR. Delivery is added once you choose your country.'} Dispatched in ${DISPATCH.days}.</p>
    <ul class="bag-l1__assure">
      <li>${EXCHANGES.short}</li>
    </ul>`;
}

/** The short read-back above the Place order button. */
function recapHtml(ctx, region, pay) {
  const t = totals(ctx, region);
  const r = REGIONS[region];
  const method = PAYMENT.find((m) => m.key === pay) ?? PAYMENT[0];
  return html`
    <div><dt>${t.count} ${pieceWord(t.count)}</dt><dd>${formatPKR(t.subtotal)}</dd></div>
    <div><dt>Delivery</dt><dd>${r ? `${r.label}, ${formatPKR(r.fee)}` : '<span class="bag-l1__pending">Choose your country</span>'}</dd></div>
    <div><dt>Payment</dt><dd>${method.label}</dd></div>`;
}

function field(label, input, { full = false, cls = '' } = {}) {
  return `<label class="bag-l1__field${full ? ' bag-l1__field--full' : ''}${cls ? ` ${cls}` : ''}"><span class="bag-l1__label">${label}</span>${input}</label>`;
}

function option(name, value, title, note, price, checked = false) {
  return html`<label class="bag-l1__option" data-option="${value}">
    <input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}>
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
    ? '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="With the country code">'
    : '<span class="bag-l1__prefixed"><span class="bag-l1__prefix">+92</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="3XX XXXXXXX"></span>';
  const place = abroad
    ? [
        field('Country', '<input name="country" autocomplete="country-name" placeholder="For example, United Kingdom">', { full: true }),
        field('City or town', '<input name="city" autocomplete="address-level2" placeholder="City or town">'),
        field('Postcode', '<input name="postcode" autocomplete="postal-code" placeholder="Postcode or ZIP">'),
      ]
    : [
        field(
          'City',
          `<span class="bag-l1__select"><select name="city" autocomplete="address-level2">
            <option value="" selected>Choose your city</option>
            ${CITIES.map((c) => `<option>${c}</option>`).join('')}
          </select></span>`
        ),
        field('Postcode <span class="bag-l1__optional">optional</span>', '<input name="postcode" inputmode="numeric" autocomplete="postal-code" placeholder="54000">'),
      ];
  return [
    field('Full name', '<input name="name" autocomplete="name" placeholder="As it should read on the parcel">', { full: true }),
    field('Mobile number', phone),
    field('Email', '<input name="email" type="email" autocomplete="email" placeholder="For your receipt">'),
    field('Address', '<input name="address" autocomplete="street-address" placeholder="House, street and area">', { full: true }),
    ...place,
  ].join('');
}

/** The placeholder bank details, then the note to send the receipt on WhatsApp. */
function bankHtml(ctx, number = '') {
  return html`<div class="bag-l1__bank s-field">
    <div class="bag-l1__bank-head">
      <p class="s-eyebrow">Bank details</p>
      <span class="bag-l1__tag">Placeholder</span>
    </div>
    <dl class="bag-l1__bank-details">
      <div><dt>Bank</dt><dd>${BANK_DETAILS.bank}</dd></div>
      <div><dt>Account title</dt><dd>${BANK_DETAILS.title}</dd></div>
      <div><dt>Account number</dt><dd>${BANK_DETAILS.account}</dd></div>
      <div><dt>IBAN</dt><dd>${BANK_DETAILS.iban}</dd></div>
    </dl>
    <p class="bag-l1__bank-foot s-meta">Placeholder details: the real account goes here.</p>
  </div>
  <div class="bag-l1__receipt-note">
    ${whatsappIcon}
    <div>
      <p class="s-body">${BANK_DETAILS.note}</p>
      <a class="s-link" href="${receiptLink(ctx, number)}" target="_blank" rel="noopener">Send the receipt on WhatsApp</a>
    </div>
  </div>`;
}

function checkoutView(ctx) {
  const items = lines(ctx);
  const t = totals(ctx);
  return html`
    ${intro({
      title: 'Your bag',
      steps: true,
    })}

    <div class="wrap bag-l1__grid">
        <section class="bag-l1__block bag-l1__bag" id="bag-items">
          ${blockHead('', 'Your Pieces', `<span data-bag-count-label>${t.count} ${pieceWord(t.count)}</span>`)}
          <ul class="bag-l1__items" data-bag-items>${itemsHtml(ctx, items)}</ul>
          <a class="s-link bag-l1__continue" href="${ctx.href({ page: 'collection' })}">Continue shopping</a>
        </section>

        <aside class="bag-l1__aside">
          <div class="bag-l1__summary s-field s-field--soft" data-bag-summary>${summaryHtml(ctx, items, '')}</div>
          <div class="bag-l1__help">
            ${whatsappIcon}
            <div>
              <p class="bag-l1__help-title">Questions?</p>
              <p class="s-meta">Ask us anything on WhatsApp. We can also take your order there.</p>
              <a class="s-link" href="${whatsapp(ctx)}" target="_blank" rel="noopener">Message us on WhatsApp</a>
            </div>
          </div>
        </aside>

        <form class="bag-l1__form" data-demo-form data-bag-form data-pay="cod" novalidate>
          <section class="bag-l1__block" id="bag-country">
            ${blockHead('01', 'Country', 'Pakistan or elsewhere')}
            <fieldset class="bag-l1__options">
              <legend class="bag-l1__label">Where are we delivering to?</legend>
              ${Object.values(REGIONS).map((r) => option('ship', r.key, r.label, r.note, regionPrice(r)))}
            </fieldset>
            <p class="bag-l1__alert" data-ship-alert role="alert" hidden>Choose where we are delivering to, then place your order.</p>
            <p class="bag-l1__fine s-meta">Delivery is added to your total once you choose. Charges are placeholders for now.</p>

            <p class="bag-l1__label bag-l1__sub">Delivery details</p>
            <div class="bag-l1__fields" data-bag-details>${detailsHtml('')}</div>
          </section>

          <section class="bag-l1__block" id="bag-payment">
            ${blockHead('02', 'Payment', paymentText({ capital: true }))}
            <fieldset class="bag-l1__options">
              <legend class="bag-l1__label">Pay with</legend>
              ${PAYMENT.map((m, i) => option('pay', m.key, m.label, m.note, '', i === 0))}
            </fieldset>
            <p class="bag-l1__fine s-meta" data-pay-abroad hidden>Cash on delivery is for Pakistan only, so orders outside Pakistan are paid by bank transfer.</p>

            <div class="bag-l1__panel" data-pay-panel="cod">
              <p class="s-body">Pay <strong data-pay-total>${payLine(t, '')}</strong> in cash when your order arrives.</p>
            </div>
            <div class="bag-l1__panel" data-pay-panel="bank">
              <p class="s-body">Transfer <strong data-pay-total>${payLine(t, '')}</strong> to this account.</p>
              ${bankHtml(ctx)}
            </div>
          </section>

          <section class="bag-l1__block bag-l1__place" id="bag-place">
            ${blockHead('03', 'Place order')}
            <dl class="bag-l1__recap" data-bag-recap>${recapHtml(ctx, '', 'cod')}</dl>
            <button class="s-btn bag-l1__submit" type="submit">Place order <span class="bag-l1__submit-sep" aria-hidden="true"></span><span data-submit-total>${formatPKR(t.total)}</span></button>
            <p class="bag-l1__fine s-meta">${EXCHANGES.short}.</p>
          </section>
        </form>
    </div>`;
}

function emptyView(ctx) {
  return html`
    ${intro({
      title: 'Your bag is empty',
      center: true,
    })}
    <div class="wrap bag-l1__empty">
      <a class="s-btn" href="${ctx.href({ page: 'collection' })}">Shop the collection</a>
      <a class="s-link" href="${whatsapp(ctx)}" target="_blank" rel="noopener">Or ask us on WhatsApp</a>
    </div>`;
}

function confirmationView(ctx, o) {
  const first = o.name.split(/\s+/)[0];
  const t = o.totals;
  const steps = [
    ['Confirmed', 'Today'],
    ['Dispatched', `In ${DISPATCH.days}`],
    ['On its way', 'We will message you on WhatsApp when it ships'],
  ];
  return html`
    ${intro({
      eyebrow: `Order no. ${o.number}`,
      title: first ? `Thank you, ${esc(first)}` : 'Thank you',
      lede:
        o.pay === 'bank'
          ? 'Your order is in. Send us the transfer receipt on WhatsApp and we will confirm it, then message you when it ships.'
          : 'Your order is confirmed. We will message you on WhatsApp when it ships.',
      center: true,
    })}

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
          ${blockHead('', 'Your Pieces', `${t.count} ${pieceWord(t.count)}`)}
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
            <div><dt>Delivering to</dt><dd>${o.address ? esc(o.address) + '<br>' : ''}${esc([o.city, o.ship === 'international' ? o.country : 'Pakistan'].filter(Boolean).join(', ') || 'Your address')}</dd></div>
            <div><dt>Delivery</dt><dd>${REGIONS[o.ship] ? `${REGIONS[o.ship].label}, ${regionPrice(REGIONS[o.ship])}` : 'Calculated at checkout'}</dd></div>
            <div><dt>Payment</dt><dd>${o.pay === 'bank' ? 'Bank transfer. Please send the receipt on WhatsApp.' : `Cash on delivery. Please keep ${formatPKR(t.total)} ready.`}</dd></div>
          </dl>
          <div class="bag-l1__total">
            <span class="bag-l1__total-label">Total</span>
            <span class="bag-l1__total-sum">${formatPKR(t.total)}</span>
          </div>
        </section>
      </div>

      ${o.pay === 'bank' &&
      html`<section class="bag-l1__receipt-bank">
        ${blockHead('', 'Pay by bank transfer', `Transfer ${formatPKR(t.total)}`)}
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
  // Arriving on the Page with an empty bag: seed the example once.
  enter(ctx) {
    if (!order && !ctx.bag.count()) EXAMPLE_BAG.forEach(([piece, size, qty, dupatta]) => ctx.bag.add(piece, size, qty, dupatta));
  },

  render(ctx) {
    const kind = viewKind(ctx);
    return `<div class="bag-l1__root" data-bag-root data-view="${kind}">${view(ctx, kind)}</div>`;
  },

  mount(el, ctx) {
    const root = el.querySelector('[data-bag-root]');
    const scroller = el.closest('.site-scroll');
    const form = () => root.querySelector('[data-bag-form]');
    const ship = () => form()?.elements.ship?.value ?? '';
    const pay = () => form()?.elements.pay?.value || 'cod';

    // Summary, recap, payment amounts and the button follow the lines, the country and the payment.
    const repaintTotals = () => {
      const region = ship();
      const t = totals(ctx, region);
      root.querySelector('[data-bag-summary]').innerHTML = summaryHtml(ctx, lines(ctx), region);
      root.querySelector('[data-bag-recap]').innerHTML = recapHtml(ctx, region, pay());
      root.querySelectorAll('[data-pay-total]').forEach((n) => (n.textContent = payLine(t, region)));
      root.querySelectorAll('[data-submit-total]').forEach((n) => (n.textContent = formatPKR(t.total)));
    };

    // Reshape the address fields for the chosen country, keeping the name, number, email and street.
    const KEEP = ['name', 'phone', 'email', 'address'];
    const repaintDetails = () => {
      const box = root.querySelector('[data-bag-details]');
      const kept = {};
      box.querySelectorAll('input').forEach((f) => KEEP.includes(f.name) && (kept[f.name] = f.value));
      box.innerHTML = detailsHtml(ship());
      box.querySelectorAll('input').forEach((f) => kept[f.name] && (f.value = kept[f.name]));
    };

    // Only the payment methods offered for the chosen country show; a hidden choice moves to the first one left.
    const syncPayment = () => {
      const f = form();
      const offered = paymentFor(ship()).map((m) => m.key);
      f.querySelectorAll('[name="pay"]').forEach((input) => {
        const on = offered.includes(input.value);
        input.disabled = !on;
        input.closest('[data-option]').hidden = !on;
      });
      if (!offered.includes(pay())) f.elements.pay.value = offered[0];
      f.dataset.pay = pay();
      root.querySelector('[data-pay-abroad]').hidden = offered.length === PAYMENT.length;
    };

    const paint = () => {
      const kind = viewKind(ctx);
      if (kind !== root.dataset.view) {
        root.dataset.view = kind;
        root.innerHTML = view(ctx, kind);
        scroller?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (kind !== 'checkout') return;
      const t = totals(ctx);
      root.querySelector('[data-bag-items]').innerHTML = itemsHtml(ctx, lines(ctx)).join('');
      root.querySelector('[data-bag-count-label]').textContent = `${t.count} ${pieceWord(t.count)}`;
      repaintTotals();
    };

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
        root.querySelector(`#${stepLink.dataset.goto}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (e.target.closest('[data-new-order]')) order = null;
    };

    const onChange = (e) => {
      if (e.target.name === 'ship') {
        root.querySelector('[data-ship-alert]').hidden = true;
        repaintDetails();
        syncPayment();
        repaintTotals();
      }
      if (e.target.name === 'pay') {
        form().dataset.pay = e.target.value;
        repaintTotals();
      }
    };

    // A demo: nothing is sent. Without a country there is no delivery line yet, so ask for one first.
    const onSubmit = (e) => {
      if (!e.target.matches('[data-bag-form]')) return;
      e.preventDefault();
      const fields = e.target.elements;
      const val = (n) => fields.namedItem(n)?.value?.trim() ?? '';
      const items = lines(ctx);
      if (!items.length) return;
      if (!REGIONS[val('ship')]) {
        root.querySelector('[data-ship-alert]').hidden = false;
        root.querySelector('#bag-country')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      order = {
        number: String(1000 + (Date.now() % 9000)),
        name: val('name'),
        address: val('address'),
        city: val('city'),
        country: val('country'),
        ship: val('ship'),
        pay: val('pay') || 'cod',
        items,
        totals: totals(ctx, val('ship')), // before the bag is cleared
      };
      ctx.bag.clear(); // repaints through the subscription below
    };

    const unsubscribe = ctx.bag.subscribe(paint);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('submit', onSubmit);

    return () => {
      unsubscribe();
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('submit', onSubmit);
      // Keep the confirmation across Name/Frame switches; forget it once the reviewer leaves.
      if (current().page !== 'bag') order = null;
    };
  },
};

export const layouts = [atelier];
