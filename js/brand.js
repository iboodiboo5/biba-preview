// The brand record, one per Name. The client is choosing between Biba (her
// hand-lettered logo, the working name) and Anaar (the pomegranate mark); the
// look is the same under both. Every line of copy that names the brand reads
// it from here (ctx.brand), never from a literal.
//
// Logo files are resolved in images.js (LOGO); this module only says which
// one a Name uses.

import { LOGO } from './images.js';

export const NAMES = [
  {
    key: 'biba',
    name: 'Biba',
    logo: LOGO.biba, // hand-lettered script with the star over the i: the logo is the name
  },
  {
    key: 'anaar',
    name: 'Anaar',
    logo: LOGO.anaar, // pomegranate mark, set beside the lowercase "anaar" wordmark
    wordmark: 'anaar', // a Name without one has its name lettered in the logo
  },
];

// Lines shared by both Names. They read the name from the record they belong to.
// No email yet: the address waits until the name is decided.
// Customer-facing copy is lowercase ("prints", "pieces"): the glossary's capitals are for the team.
// The brand line's own hyphens are non-breaking (U+2011), so it never breaks at "pure-|cotton".
const NBH = '\u2011';
const SHARED = {
  line: (b) => `${b.name} makes happy, pure${NBH}cotton clothes with hand${NBH}painted prints, in Pakistan.`,
  hello: (b, text = '') => `Hello ${b.name}${text ? `, ${text}` : ''}`,
};

for (const b of NAMES) {
  /** The brand line (Home), with the name in it. */
  b.line = SHARED.line(b);
  /** The opening of a WhatsApp message to the brand: hello('I have a question.') */
  b.hello = (text) => SHARED.hello(b, text);
}

export const DEFAULT_NAME = NAMES[0].key;

export function brandFor(key) {
  return NAMES.find((b) => b.key === key) ?? NAMES[0];
}
