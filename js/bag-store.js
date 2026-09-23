// The simulated customer's bag. Not part of the Combination (never in the hash).
// Kept in browser storage so it survives reloads; works without it too.
// Lines: { piece: '<piece key>', size: 'XS' | 'S' | 'M' | 'L', qty: 1..MAX_QTY, dupatta: boolean }
// Two lines differ if the Piece, size or dupatta choice differs; adding a match
// raises its quantity instead. The site nav shows count() and updates itself
// through subscribe().
// Whatever comes back from storage is checked: unknown or sold-out Pieces,
// removed sizes (XL, custom) and quantities that are not whole numbers are
// dropped, so no NaN reaches a total. A sold-out Piece can never be added.

import { PIECES, SIZES, pieceByKey } from './pieces.js';

const KEY = 'anaar-mockups:bag';
export const MAX_QTY = 9;

const BUYABLE = new Set(PIECES.filter((p) => !p.soldOut).map((p) => p.key));
const SIZE_VALUES = new Set(SIZES);

/** A whole quantity clamped to 1..MAX_QTY, or 0 if `n` is not a positive number. */
function cleanQty(n) {
  const q = Math.floor(Number(n));
  return Number.isFinite(q) && q >= 1 ? Math.min(q, MAX_QTY) : 0;
}

function cleanItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const qty = cleanQty(raw.qty);
  if (!BUYABLE.has(raw.piece) || !SIZE_VALUES.has(raw.size) || !qty) return null;
  return { piece: raw.piece, size: raw.size, qty, dupatta: raw.dupatta === true };
}

let items = load();
const listeners = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.map(cleanItem).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: bag lasts for this visit only */
  }
  listeners.forEach((cb) => cb(list()));
}

/** Whether a Piece (key) can go in the bag: known and not sold out. */
export function canAdd(pieceKey) {
  return BUYABLE.has(pieceKey);
}

/** Price of one of this line: the two-piece plus the dupatta if added. */
export function unitPrice(line) {
  const p = pieceByKey(line.piece);
  return p.price + (line.dupatta ? p.dupattaPrice : 0);
}

/** Price of the whole line: unitPrice × quantity. */
export function lineTotal(line) {
  return unitPrice(line) * line.qty;
}

/** Sum of every line, dupatta add-ons included (delivery is added at checkout). */
export function subtotal() {
  return items.reduce((n, i) => n + lineTotal(i), 0);
}

export function list() {
  return items.map((i) => ({ ...i }));
}

export function count() {
  return items.reduce((n, i) => n + i.qty, 0);
}

/** Add a Piece in a size, with or without its dupatta. Returns false if it cannot be added. */
export function add(piece, size = 'M', qty = 1, dupatta = false) {
  const item = cleanItem({ piece, size, qty, dupatta });
  if (!item) return false;
  const found = items.find((i) => i.piece === item.piece && i.size === item.size && i.dupatta === item.dupatta);
  if (found) found.qty = cleanQty(found.qty + item.qty) || found.qty;
  else items.push(item);
  save();
  return true;
}

/** Set a line's quantity; 0 or less removes it, more than MAX_QTY is capped. */
export function setQty(index, qty) {
  if (!items[index]) return;
  const n = Number(qty);
  if (!Number.isFinite(n)) return;
  if (n <= 0) items.splice(index, 1);
  else items[index].qty = cleanQty(n);
  save();
}

export function remove(index) {
  items.splice(index, 1);
  save();
}

export function clear() {
  items = [];
  save();
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
