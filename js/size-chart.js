// The size chart, shared by the Piece page (opens in the page) and Help.
// Built from SIZE_CHART in js/pieces.js: one row per size (XS–L), one column per
// measurement. Styles are `.size-chart` in styles/components.css.
//
//   sizeChart({ units, highlight, caption, cls })  → HTML string
//   setSizeChartUnits(root, 'in' | 'cm')          → switch every chart inside root
//   markSizeChartRow(root, size)                  → mark one size's row ('' clears)
//
// Every value cell carries data-in and data-cm, every row data-size-row, so a Page
// can switch units or mark the chosen size without re-rendering. A group row over
// the columns labels the measurements "Body" (bust, waist, hips) or "Finished
// garment" (the lengths), from each column's group in SIZE_CHART.

import { html } from './ui.js';
import { SIZES, SIZE_CHART } from './pieces.js';

export const UNIT_LABELS = { in: 'Inches', cm: 'Centimetres' };

/** Inches to whole centimetres. */
const toCm = (inches) => Math.round(inches * 2.54);

const value = (inches, units) => (units === 'cm' ? toCm(inches) : inches);

/**
 * The size chart table, wrapped so it can scroll on its own if it ever outgrows
 * its column (the site never scrolls sideways).
 * @param {object} [opts]
 * @param {'in'|'cm'} [opts.units='in']  units shown first
 * @param {string} [opts.highlight='']    a size (e.g. 'M') whose row is marked
 * @param {string} [opts.caption='']      optional visible <caption>
 * @param {string} [opts.cls='']          extra class on the wrapper
 */
export function sizeChart({ units = 'in', highlight = '', caption = '', cls = '' } = {}) {
  const u = units === 'cm' ? 'cm' : 'in';
  return html`<div class="size-chart${cls ? ` ${cls}` : ''}" data-units="${u}">
    <table class="size-chart__table">
      ${caption && `<caption class="size-chart__caption">${caption}</caption>`}
      <thead>
        ${groupRow()}
        <tr>
          <th scope="col">Size</th>
          ${SIZE_CHART.columns.map(([, label]) => `<th scope="col">${label}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${SIZES.map(
          (size) => html`<tr data-size-row="${size}"${size === highlight ? ' class="is-marked"' : ''}>
            <th scope="row">${size}</th>
            ${SIZE_CHART.columns.map(([key]) => {
              const v = SIZE_CHART.rows[size][key];
              return `<td data-in="${v}" data-cm="${toCm(v)}">${value(v, u)}</td>`;
            })}
          </tr>`,
        )}
      </tbody>
    </table>
  </div>`;
}

/** "Body" over the body measurements, "Finished garment" over the lengths: one cell per run of columns. */
function groupRow() {
  const runs = [];
  for (const [, , group] of SIZE_CHART.columns) {
    const last = runs[runs.length - 1];
    if (last && last.group === group) last.span++;
    else runs.push({ group, span: 1 });
  }
  if (!runs.some((r) => r.group)) return '';
  return `<tr class="size-chart__groups"><td></td>${runs
    .map((r) => `<th scope="colgroup" colspan="${r.span}">${SIZE_CHART.groups?.[r.group] ?? ''}</th>`)
    .join('')}</tr>`;
}

/** Switch every size chart inside `root` to 'in' or 'cm'. */
export function setSizeChartUnits(root, units) {
  const u = units === 'cm' ? 'cm' : 'in';
  root.querySelectorAll('.size-chart').forEach((chart) => {
    chart.dataset.units = u;
    chart.querySelectorAll('td[data-in]').forEach((td) => (td.textContent = td.dataset[u]));
  });
}

/** Mark one size's row in every size chart inside `root`; '' clears the mark. */
export function markSizeChartRow(root, size) {
  root.querySelectorAll('.size-chart [data-size-row]').forEach((row) => {
    row.classList.toggle('is-marked', row.dataset.sizeRow === size);
  });
}
