// Help: 1 Layout (count fixed in js/pages.js).
// Each Layout: { name, render(ctx) => html, mount?(el, ctx) => cleanup?, header?: 'overlay' }
// See docs/conventions.md.
//
// Every answer reads the buying rules from js/pieces.js, so Help never
// disagrees with the Piece page or checkout. No returns promise, no custom
// measurements, no appointments.
//
// The size chart table comes from the shared renderer in js/size-chart.js (the
// same one the Piece page uses); Help adds its own in/cm switch around it.

import { html, esc, sectionHead } from '../ui.js';
import { sizeChart, setSizeChartUnits, UNIT_LABELS } from '../size-chart.js';
import {
  SIZE_CHART, CARE, DISPATCH, DELIVERY, BANK_DETAILS, EXCHANGES, FABRIC, formatPKR, whatsappLink, sizeRange, paymentText,
} from '../pieces.js';

const { pakistan: PK, international: INTL } = DELIVERY.regions;

const TOPICS = [
  ['sizes', 'Sizes'],
  ['delivery', 'Delivery'],
  ['payment', 'Payment'],
  ['exchanges', 'Exchanges'],
  ['contact', 'Contact'],
];

const GLANCE = [
  ['Exchanges', EXCHANGES.short],
  ['Sizes', `${sizeRange()}, no custom sizing`],
  ['Dispatch', DISPATCH.days],
  ['Payment', paymentText({ capital: true })],
];

const MEASURE = [
  ['Bust', 'Around the fullest part, tape level across the back.'],
  ['Waist', 'Around the narrowest part.'],
  ['Hips', 'Around the fullest part, feet together.'],
  ['Lengths', 'Kurta and shalwar lengths are the finished garment.'],
];

const FAQ = [
  {
    key: 'delivery',
    group: 'Delivery',
    items: [
      ['When will my order be dispatched?', DISPATCH.text],
      [
        'How much is delivery?',
        `${DELIVERY.text} Within Pakistan it is ${formatPKR(PK.fee)}; outside Pakistan it is ${formatPKR(INTL.fee)}, about USD ${INTL.usd}. (Placeholder amounts.)`,
      ],
      [
        'Do you deliver outside Pakistan?',
        'Yes. Choose your country at checkout and the delivery charge is added to your total. Outside Pakistan, you pay by bank transfer.',
      ],
    ],
  },
  {
    key: 'payment',
    group: 'Payment',
    items: [
      ['How can I pay?', `By ${paymentText()}. Choose at checkout.`],
      ['How does bank transfer work?', `Choose bank transfer at checkout and our bank details appear. ${BANK_DETAILS.note}`],
    ],
  },
  {
    key: 'exchanges',
    group: 'Exchanges',
    items: [
      ['Can I return a Piece?', EXCHANGES.text],
      ['How do I ask for an exchange?', 'Message us on WhatsApp with your order number and what is wrong, and we will arrange it.'],
    ],
  },
  {
    key: 'pieces',
    group: 'The Pieces',
    items: [
      [
        'Is the dupatta included?',
        `No. Each Piece is a two-piece: a short kurta and shalwar in ${FABRIC.kurta.toLowerCase()}. You can add the matching ${FABRIC.dupatta.toLowerCase()} dupatta on the Piece page.`,
      ],
      ['Do you offer custom sizing?', `No. Every Piece comes in ${sizeRange()}. Check the size chart before you order.`],
      ['What if I am between sizes?', 'Check the size chart, or message us on WhatsApp and we will help you choose.'],
      ['Will a sold-out design come back?', 'Every design is made in limited numbers, so once it sells out it is sold out. We may restock if lots of you ask.'],
      ['How do I look after it?', `${CARE.text}${CARE.placeholder ? ' (Placeholder care note.)' : ''}`],
    ],
  },
];

const plus = '<span class="help-l1__plus" aria-hidden="true"></span>';

/** The shared size chart, inches first, with Help's in/cm switch above it. */
function helpSizeChart() {
  return html`<div class="help-l1__chart" data-units="in">
    <div class="help-l1__chart-bar">
      <p class="s-meta">Measurements in <span data-unit-label>${UNIT_LABELS.in.toLowerCase()}</span>${SIZE_CHART.placeholder ? ' (placeholder figures)' : ''}</p>
      <div class="help-l1__units" role="group" aria-label="Units">
        <button type="button" data-units="in" aria-pressed="true">in</button>
        <button type="button" data-units="cm" aria-pressed="false">cm</button>
      </div>
    </div>
    ${sizeChart({ units: 'in' })}
  </div>`;
}

/* ---------- Layout 1 · Client care ---------- */

const clientCare = {
  name: 'Client care',
  render(ctx) {
    const WHATSAPP = whatsappLink(ctx.brand.hello('I have a question.'));

    return html`
      <section class="help-l1__intro s-field">
        <div class="wrap help-l1__intro-grid">
          <div class="help-l1__intro-text">
            <h1 class="s-display s-display--xl help-l1__title">Help</h1>
            <p class="s-lede">Quick answers on sizes, delivery, payment and exchanges. Anything else, just message us.</p>
          </div>
          <nav class="help-l1__topics" aria-label="Help topics">
            ${TOPICS.map(
              ([key, label]) => html`<button type="button" class="help-l1__topic" data-goto="${key}">${label}</button>`,
            )}
          </nav>
        </div>
      </section>

      <section class="help-l1__glance" aria-label="At a glance">
        <div class="wrap">
          <ul class="help-l1__glance-list">
            ${GLANCE.map(
              ([label, text]) => html`<li>
                <p class="s-eyebrow">${label}</p>
                <p class="help-l1__glance-text">${text}</p>
              </li>`,
            )}
          </ul>
        </div>
      </section>

      <section class="help-l1__sizes s-field s-field--soft" data-topic="sizes">
        <div class="wrap help-l1__sizes-grid">
          <div class="help-l1__sizes-main">
            ${sectionHead({ title: 'Size chart' })}
            <p class="s-body">Every Piece comes in ${sizeRange()}. There is no custom sizing, so check your measurements against the chart before you order.</p>
            ${helpSizeChart()}
          </div>
          <aside class="help-l1__measure">
            <p class="s-eyebrow">How to measure</p>
            <ol class="help-l1__measure-list">
              ${MEASURE.map(
                ([title, text]) => html`<li>
                  <span class="help-l1__measure-title">${title}</span>
                  <span class="s-meta">${text}</span>
                </li>`,
              )}
            </ol>
            <p class="s-meta">Not sure? <a class="help-l1__inline" href="${WHATSAPP}" target="_blank" rel="noopener">Ask us on WhatsApp</a>.</p>
          </aside>
        </div>
      </section>

      <section class="help-l1__faq">
        <div class="wrap wrap--narrow">
          ${sectionHead({ title: 'Questions and answers', center: true })}
          ${FAQ.map(
            ({ key, group, items }) => html`<div class="help-l1__faq-group" data-topic="${key}">
              <h3 class="s-eyebrow help-l1__faq-head">${group}</h3>
              ${items.map(
                ([q, a], i) => html`<details class="help-l1__qa"${i === 0 && key === FAQ[0].key ? ' open' : ''}>
                  <summary><span>${q}</span>${plus}</summary>
                  <p class="s-body">${esc(a)}</p>
                </details>`,
              )}
            </div>`,
          )}
        </div>
      </section>

      <section class="help-l1__contact" data-topic="contact">
        <div class="wrap help-l1__contact-inner">
          <div class="help-l1__contact-text">
            <h2 class="s-display s-display--l">Still got a question?</h2>
            <p class="s-body">WhatsApp is the quickest way to reach us, for sizes, orders and exchanges.</p>
          </div>
          <div class="help-l1__contact-actions">
            <a class="s-btn" href="${WHATSAPP}" target="_blank" rel="noopener">Message us on WhatsApp</a>
          </div>
        </div>
      </section>
    `;
  },

  mount(el) {
    const onClick = (e) => {
      const goto = e.target.closest('[data-goto]');
      if (goto) {
        el.querySelector(`[data-topic="${goto.dataset.goto}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const unit = e.target.closest('.help-l1__units [data-units]');
      if (unit) {
        const chart = unit.closest('.help-l1__chart');
        const u = unit.dataset.units;
        chart.dataset.units = u;
        chart.querySelector('[data-unit-label]').textContent = UNIT_LABELS[u].toLowerCase();
        chart.querySelectorAll('.help-l1__units button').forEach((b) => b.setAttribute('aria-pressed', String(b === unit)));
        setSizeChartUnits(chart, u);
      }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  },
};

export const layouts = [clientCare];
