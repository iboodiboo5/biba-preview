// Favourites store (ADR-0002). One interface, two backends:
//
//   - Published as a claude.ai artifact: the artifact's shared `db`, so every
//     reviewer sees every Favourite, with the viewer identity from `user`.
//   - Opened locally (no runtime, or the runtime grants no db): browser storage.
//
// The UI only uses list(), add(), remove(), subscribe(), status() and never
// learns which backend answered. Only one backend is ever live.
//
// A Favourite: { id, combo, at, mine, who }
//   combo  the Combination { page, piece, dir, layout, name, img, frame } (no view)
//   at     saved time, ms since epoch
//   mine   whether the current viewer saved it (only they may remove it)
//   who    display name of whoever saved it ("You" for the viewer)
//
// Shared layout: one document per viewer, `favourites/<viewer id>`, holding
// { items: [{ id, combo, at }] }. The publish rules (docs/conventions.md,
// "Publishing") let everyone read the collection and each viewer write only
// their own document, so "remove own only" holds on the server too.
//
// Every stored record is checked against the known values on the way in
// (validCombination in state.js); anything unknown or malformed is skipped.
// Favourites saved before Frame was recorded open in Desktop.

import { validCombination } from './state.js';

const LOCAL_KEY = 'anaar-mockups:favourites';
const COLLECTION = 'favourites';
const COMBO_FIELDS = ['page', 'piece', 'dir', 'layout', 'name', 'img', 'frame'];

let items = [];
let state = { ready: false, canWrite: false, note: 'Connecting…', error: '' };
let backend = null;
const listeners = new Set();

/* ---------- Public interface ---------- */

export function list() {
  return items.map((f) => ({ ...f, combo: { ...f.combo } }));
}

export function status() {
  return { ...state };
}

/** Save a Combination. Resolves to the new Favourite's id, or null if it could not be saved. */
export async function add(combination) {
  if (!backend || !state.canWrite) return null;
  const combo = pick(combination);
  const fav = { id: newId(), combo, at: Date.now() };
  try {
    await backend.add(fav);
    return fav.id;
  } catch (err) {
    fail(err);
    return null;
  }
}

/** Remove one of the viewer's own Favourites. Others' Favourites are left alone. */
export async function remove(id) {
  if (!backend || !items.some((f) => f.id === id && f.mine)) return false;
  try {
    await backend.remove(id);
    return true;
  } catch (err) {
    fail(err);
    return false;
  }
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Stable key for "the same Combination", used to spot duplicates and group votes. */
export function comboKey(combination) {
  const c = pick(combination);
  return COMBO_FIELDS.map((k) => `${k}=${c[k] ?? ''}`).join('&');
}

/** The viewer's own Favourites of this Combination (usually zero or one). */
export function mineFor(combination) {
  const key = comboKey(combination);
  return items.filter((f) => f.mine && comboKey(f.combo) === key).map((f) => ({ ...f, combo: { ...f.combo } }));
}

/* ---------- Internals ---------- */

function pick(s) {
  const c = {};
  for (const k of COMBO_FIELDS) if (s[k] != null) c[k] = s[k];
  if (c.page !== 'piece') delete c.piece;
  return c;
}

/** A stored record as { id, combo, at }, or null if any part of it is invalid. */
function cleanRecord(f) {
  if (!f || typeof f !== 'object') return null;
  if (typeof f.id !== 'string' || !f.id || !Number.isFinite(f.at)) return null;
  const combo = validCombination(f.combo);
  return combo ? { id: f.id, combo, at: f.at } : null;
}

const cleanRecords = (raw) => (Array.isArray(raw) ? raw.map(cleanRecord).filter(Boolean) : []);

function newId() {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function emit() {
  items.sort((a, b) => b.at - a.at);
  const snapshot = list();
  listeners.forEach((cb) => cb(snapshot, status()));
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function fail(err) {
  const code = err?.code;
  console.warn('Favourites: could not save', err);
  if (code === 'invalid_argument' || code === 'not_granted' || code === 'revoked') {
    setState({ canWrite: false, error: 'You can see Favourites but not add them on this link.' });
  } else if (code === 'quota_exceeded') {
    setState({ error: 'The Favourites store is full. Remove some old ones first.' });
  } else {
    setState({ error: 'That did not save. Try again in a moment.' });
  }
}

/* ---------- Local backend: browser storage ---------- */

function localBackend() {
  const read = () => {
    try {
      return cleanRecords(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]'));
    } catch {
      return [];
    }
  };
  let own = read();
  const publish = () => {
    items = own.map((f) => ({ ...f, mine: true, who: 'You' }));
    emit();
  };
  const write = () => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(own));
    } catch {
      /* storage blocked: Favourites last for this visit only */
    }
    publish();
  };
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === LOCAL_KEY) {
        own = read();
        publish();
      }
    });
  } catch {
    /* ignore */
  }
  state = { ready: true, canWrite: true, note: 'Saved in this browser only. Publish the tool to share them.', error: '' };
  publish();
  return {
    add: async (fav) => {
      own = [...own, fav];
      write();
    },
    remove: async (id) => {
      own = own.filter((f) => f.id !== id);
      write();
    },
  };
}

/* ---------- Shared backend: claude.ai artifact db ---------- */

/**
 * Resolves to the backend once the viewer's identity and write permission are
 * known and the first snapshot has arrived. Rejects, with its listener already
 * stopped, if any of that fails, so the caller can fall back to browser storage
 * and only one backend is ever live.
 */
async function sharedBackend(db, user) {
  // The permission check comes first: no listener starts until it answers.
  const me = user ? await user.id() : null;
  const may = user ? await user.can('data.write') : null; // null means "not told": let a refused write decide

  let docs = []; // [{ owner, items }]
  let myItems = [];
  let writing = Promise.resolve();

  const showWithNames = async () => {
    const owners = docs.map((d) => d.owner).filter((o) => o !== me);
    let names = {};
    if (user && owners.length) {
      try {
        names = await user.profiles(owners);
      } catch {
        names = {};
      }
    }
    items = docs.flatMap((d) =>
      d.items.map((f) => ({
        ...f,
        mine: d.owner === me,
        who: d.owner === me ? 'You' : names[d.owner]?.name || 'Someone',
      })),
    );
    emit();
  };

  const takeSnapshot = (snap) => {
    docs = snap.docs
      .filter((d) => d.exists)
      .map((d) => {
        let body;
        try {
          body = d.data() ?? {};
        } catch {
          body = {};
        }
        return { owner: d.id, items: cleanRecords(body.items) };
      });
    myItems = docs.find((d) => d.owner === me)?.items.map((f) => ({ ...f, combo: { ...f.combo } })) ?? [];
    showWithNames();
  };

  await new Promise((resolve, reject) => {
    let settled = false;
    let stopped = false;
    let unsubscribe = null;
    const stop = () => {
      stopped = true;
      unsubscribe?.();
    };
    unsubscribe = db.collection(COLLECTION).onSnapshot(
      (snap) => {
        if (stopped) return;
        takeSnapshot(snap);
        if (!settled) {
          settled = true;
          resolve();
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          stop();
          reject(err);
          return;
        }
        console.warn('Favourites: live updates stopped', err);
        setState({ error: 'Live updates stopped. Reload to see new Favourites.' });
      },
    );
    // The error callback can fire before onSnapshot returns its unsubscribe.
    if (stopped) unsubscribe?.();
  });

  const canWrite = me != null && may !== false;
  state = {
    ready: true,
    canWrite,
    note: 'Shared with everyone who opens this link.',
    error: me == null ? 'You can see Favourites here but not add them: claude.ai did not share who you are.' : '',
  };
  emit();

  // One write at a time to our own document; each write sends the whole list.
  // `change` runs when the write's turn comes, so quick successive clicks all land.
  const save = (change) => {
    writing = writing
      .catch(() => {})
      .then(async () => {
        const next = change(myItems);
        await db.doc(`${COLLECTION}/${me}`).set({ items: next });
        myItems = next;
      });
    return writing;
  };

  return {
    add: (fav) => save((mine) => [...mine, fav]),
    remove: (id) => save((mine) => mine.filter((f) => f.id !== id)),
  };
}

/* ---------- Boot: pick a backend ---------- */

async function boot() {
  const claude = typeof window !== 'undefined' ? window.claude : undefined;
  if (claude && typeof claude.use === 'function') {
    emit(); // "Connecting…" while the viewer answers
    try {
      const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
      if (db) {
        backend = await sharedBackend(db, user);
        return;
      }
    } catch (err) {
      console.warn('Favourites: shared store unavailable, using this browser', err);
      items = [];
    }
  }
  backend = localBackend();
}

boot();
