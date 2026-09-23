// The range and its buying rules. Single source of truth for names, prices and copy.
// Image files are never referenced here by path: use images.js (pieceImg) with
// the Piece and an image kind ('front' | 'detail' | 'print').
//
// PLACEHOLDERS: the client has not supplied final design names, prices, dupatta
// prices, size-chart measurements, delivery amounts or bank details. Every such
// value below is a placeholder; the rule constants carry `placeholder: true`.
// Every Piece's name, price and dupatta price are placeholders. The four Pieces
// with `real: false` also have an invented sample Print, and the site marks
// them "Sample design" (isSample).

export const DROP = {
  name: 'The first collection', // placeholder title
  intro: 'Six two-pieces in pure cotton: a short kurta with a farshi or slim shalwar. Add the matching chiffon dupatta if you like.',
};

// One WhatsApp number for every "Order/Message on WhatsApp" link.
// Placeholder: replace with the brand's WhatsApp Business number (country code, no +).
export const WHATSAPP_NUMBER = '923000000000';

/** wa.me link to the brand with a prefilled message. */
export function whatsappLink(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/* ---------- Sizes ---------- */

// No custom sizing: the client offers these four only.
export const SIZES = ['XS', 'S', 'M', 'L'];

/** The size range for copy: "XS to L". */
export function sizeRange() {
  return `${SIZES[0]} to ${SIZES[SIZES.length - 1]}`;
}

// Body measurements in inches; the lengths are the finished garment. Placeholder figures.
// Each column: [key, label, group], the group being 'body' or 'garment' (the chart's
// "Body" / "Finished garment" row, GROUPS).
export const SIZE_CHART = {
  placeholder: true,
  groups: { body: 'Body', garment: 'Finished garment' },
  columns: [
    ['bust', 'Bust', 'body'],
    ['waist', 'Waist', 'body'],
    ['hips', 'Hips', 'body'],
    ['kurta', 'Kurta length', 'garment'],
    ['shalwar', 'Shalwar length', 'garment'],
  ],
  rows: {
    XS: { bust: 32, waist: 26, hips: 35, kurta: 34, shalwar: 37 },
    S: { bust: 34, waist: 28, hips: 37, kurta: 35, shalwar: 38 },
    M: { bust: 36, waist: 30, hips: 39, kurta: 36, shalwar: 39 },
    L: { bust: 38, waist: 32, hips: 41, kurta: 37, shalwar: 40 },
  },
};

/* ---------- What a Piece is ---------- */

export const TROUSERS = {
  farshi: 'Farshi shalwar',
  slim: 'Slim shalwar',
};

export const FABRIC = {
  kurta: 'Pure cotton',
  shalwar: 'Pure cotton',
  dupatta: 'Chiffon',
};

/** What comes in the two-piece: [{ item, fabric }], short kurta first. */
export function pieceContents(piece) {
  return [
    { item: 'Short kurta', fabric: FABRIC.kurta },
    { item: TROUSERS[piece.trouser], fabric: FABRIC.shalwar },
  ];
}

// Placeholder: a short general note until the client confirms her care instructions.
export const CARE = {
  placeholder: true,
  text: 'Wash gently in cold water and dry in the shade.',
};

/* ---------- Buying rules ---------- */

export const DISPATCH = {
  days: '7 to 10 working days',
  text: 'Every order is dispatched in 7 to 10 working days.',
};

// Delivery is calculated at checkout from the country. Amounts are placeholders.
// International is charged in PKR so the bag total adds up; the USD note is for reading.
export const DELIVERY = {
  placeholder: true,
  text: 'Delivery charges are calculated at checkout.',
  regions: {
    pakistan: { key: 'pakistan', label: 'Pakistan', fee: 350, note: 'Anywhere in Pakistan' },
    international: { key: 'international', label: 'Outside Pakistan', fee: 17000, usd: 60, note: 'Anywhere else' },
  },
};

/** The delivery charge for a region key, or null before a country is chosen. */
export function deliveryFee(region) {
  return DELIVERY.regions[region]?.fee ?? null;
}

// `regions`: the delivery regions a method is offered in (all when missing).
// Cash on delivery is Pakistan only; outside Pakistan, bank transfer is the one way to pay.
export const PAYMENT = [
  {
    key: 'cod',
    label: 'Cash on delivery',
    note: 'Pay the courier in cash when your order arrives. Pakistan only',
    regions: ['pakistan'],
    only: 'Pakistan only',
  },
  // The receipt and the order number are asked for on the confirmation, once the order exists.
  { key: 'bank', label: 'Bank transfer', note: "Transfer the total to the account below; we'll confirm on WhatsApp" },
];

/** The payment methods offered for a delivery region ('' before a country is chosen: all of them). */
export function paymentFor(region = '') {
  return PAYMENT.filter((m) => !region || !m.regions || m.regions.includes(region));
}

/** How to pay, for copy: "cash on delivery (Pakistan only) or bank transfer"; `capital` starts it upper case. */
export function paymentText({ capital = false } = {}) {
  const text = PAYMENT.map((m) => `${m.label.toLowerCase()}${m.only ? ` (${m.only})` : ''}`).join(' or ');
  return capital ? text[0].toUpperCase() + text.slice(1) : text;
}

// Placeholder: the client will supply the real account.
/** "1 piece", "3 pieces": every count of pieces in the copy. */
export const pieceCount = (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`;

export const BANK_DETAILS = {
  placeholder: true,
  bank: 'Bank name (placeholder)',
  title: 'Account title (placeholder)',
  account: '0000 0000 0000 0000',
  iban: 'PK00 XXXX 0000 0000 0000 0000',
  note: 'Once your order is placed, send the transfer receipt on WhatsApp with your order number. We dispatch once it clears.',
};

export const EXCHANGES = {
  short: 'Exchanges only, no returns',
  text: 'We are a new brand, so we offer exchanges only, no returns. If something is wrong with your order, message us on WhatsApp and we will exchange it.',
};

/* ---------- The six Pieces ---------- */

// `framing`: where the front photo is anchored when Home's banner shows it under the
// header (object-position): from the top, centred on the model.
export const PIECES = [
  {
    key: 'posy',
    framing: '46% 0%',
    name: 'Posy',
    real: true, // the client's own Print
    price: 14500,
    dupattaPrice: 4500,
    trouser: 'farshi',
    ground: 'pink',
    groundLabel: 'Pink gingham',
    print: 'Watercolour hydrangea bouquets on pink gingham, with a floral border at the hem.',
    description: 'Pink gingham with hand-painted hydrangea bouquets.',
    soldOut: false,
  },
  {
    key: 'buttercup',
    framing: '50% 0%',
    name: 'Buttercup',
    real: true, // the client's own Print
    price: 15500,
    dupattaPrice: 4500,
    trouser: 'slim',
    ground: 'butter',
    groundLabel: 'Butter gingham',
    print: 'Dusty-rose florals on a trellis of vines over butter-yellow gingham, with a blue bow, a scalloped lace border and a peach band at the hem.',
    description: 'Butter gingham with a hand-painted rose trellis.',
    soldOut: false,
  },
  {
    key: 'pistachio',
    framing: '52% 0%',
    name: 'Pistachio',
    real: false, // stand-in until the next designs are ready
    price: 13500,
    dupattaPrice: 4000,
    trouser: 'slim',
    ground: 'mint',
    groundLabel: 'Mint gingham',
    print: 'Small white daisies scattered over mint gingham.',
    description: 'Mint gingham with painted daisies.',
    soldOut: false,
  },
  {
    key: 'lilac',
    framing: '50% 0%',
    name: 'Lilac',
    real: false,
    price: 14500,
    dupattaPrice: 4500,
    trouser: 'farshi',
    ground: 'lilac',
    groundLabel: 'Lilac gingham',
    print: 'Sprigs of lilac and sweet pea over lilac gingham, with a painted border at the hem.',
    description: 'Lilac gingham with painted sweet peas.',
    soldOut: false,
  },
  {
    key: 'bluebell',
    framing: '50% 0%',
    name: 'Bluebell',
    real: false,
    price: 13500,
    dupattaPrice: 4000,
    trouser: 'slim',
    ground: 'sky',
    groundLabel: 'Sky gingham',
    print: 'Bluebells and tiny bows over sky-blue gingham.',
    description: 'Sky gingham with painted bluebells.',
    soldOut: true, // shows the sold-out state
  },
  {
    key: 'apricot',
    framing: '52% 0%',
    name: 'Apricot',
    real: false,
    price: 15000,
    dupattaPrice: 5000,
    trouser: 'farshi',
    ground: 'peach',
    groundLabel: 'Peach gingham',
    print: 'Loose peach and coral roses over peach gingham, with a scalloped border at the hem.',
    description: 'Peach gingham with painted roses.',
    soldOut: false,
  },
];

/** A stand-in Piece: its Print is an invented sample, not one of the founder's own. */
export function isSample(piece) {
  return !piece.real;
}

export function pieceByKey(key) {
  return PIECES.find((p) => p.key === key) ?? PIECES[0];
}

export function formatPKR(amount) {
  return `PKR ${amount.toLocaleString('en-US')}`;
}
