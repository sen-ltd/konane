// 1×n Konane on an unbounded row.
//
// A stone's colour is fixed by the parity of its square: it only ever moves
// two squares at a time, so the board's checkerboard colouring never changes.
// Squares with an even index hold white stones (Right), odd squares black
// stones (Left), following Chan and Tsai's convention that a pattern starts
// with a white stone on the left.
//
// A position is stored as the occupied squares between its first and last
// stone, plus the parity of the first stone's square: key "0" + "1011" is
// ◦ • · • (white, black, gap, black). The empty row is "".

import { type GameId, make, neg, sum } from './cgt.ts';

export type Player = 'L' | 'R';

/** Key of the position whose occupied absolute squares are given. */
export function keyOf(cells: Iterable<number>): string {
  const xs = [...cells].sort((a, b) => a - b);
  if (xs.length === 0) return '';
  const lo = xs[0];
  const hi = xs[xs.length - 1];
  const bits = new Array<string>(hi - lo + 1).fill('0');
  for (const x of xs) bits[x - lo] = '1';
  return String(((lo % 2) + 2) % 2) + bits.join('');
}

/** Occupied squares of a key, placed so that the first stone sits on square 0 or 1. */
export function cellsOf(key: string): number[] {
  if (key === '') return [];
  const p = key.charCodeAt(0) - 48;
  const out: number[] = [];
  for (let i = 1; i < key.length; i++) if (key.charCodeAt(i) === 49) out.push(p + i - 1);
  return out;
}

/** True when the square holds a black (Left) stone's colour. */
export const isBlackSquare = (x: number) => ((x % 2) + 2) % 2 === 1;

export interface Move {
  from: number;
  to: number;
  /** squares of the stones jumped over, in order */
  captured: number[];
}

/** Every move (single or multiple jump) for the player, in absolute squares. */
export function movesOn(occ: ReadonlySet<number>, player: Player): Move[] {
  const out: Move[] = [];
  for (const x of occ) {
    if (isBlackSquare(x) !== (player === 'L')) continue;
    for (const d of [-1, 1]) {
      const captured: number[] = [];
      let at = x;
      while (occ.has(at + d) && !occ.has(at + 2 * d)) {
        captured.push(at + d);
        at += 2 * d;
        out.push({ from: x, to: at, captured: captured.slice() });
      }
    }
  }
  return out;
}

export function apply(occ: ReadonlySet<number>, m: Move): Set<number> {
  const next = new Set(occ);
  next.delete(m.from);
  for (const c of m.captured) next.delete(c);
  next.add(m.to);
  return next;
}

interface Placed {
  key: string;
  /** absolute square = relative square + shift */
  shift: number;
}

function place(cells: readonly number[]): Placed {
  if (cells.length === 0) return { key: '', shift: 0 };
  const lo = cells[0];
  const p = ((lo % 2) + 2) % 2;
  return { key: keyOf(cells), shift: lo - p };
}

/** Key of a padded 0/1 array whose index 0 is square `base`. */
function keyOfArray(a: Uint8Array, base: number): string {
  let lo = 0;
  while (lo < a.length && a[lo] === 0) lo++;
  if (lo === a.length) return '';
  let hi = a.length - 1;
  while (a[hi] === 0) hi--;
  let s = String((((base + lo) % 2) + 2) % 2);
  for (let i = lo; i <= hi; i++) s += a[i] === 1 ? '1' : '0';
  return s;
}

/** Left and right options of a position, as keys. */
export function options(key: string): [string[], string[]] {
  if (key === '') return [[], []];
  const p = key.charCodeAt(0) - 48;
  const n = key.length - 1;
  // one empty square of padding on each side: no jump lands further out
  const a = new Uint8Array(n + 2);
  for (let i = 0; i < n; i++) a[i + 1] = key.charCodeAt(i + 1) - 48;
  const base = p - 1; // square of a[0]
  const L = new Set<string>();
  const R = new Set<string>();
  for (let i = 1; i <= n; i++) {
    if (a[i] === 0) continue;
    const black = ((base + i) & 1) === 1;
    const out = black ? L : R;
    for (const d of [-1, 1]) {
      let at = i;
      const b = a.slice();
      while (at + 2 * d >= 0 && at + 2 * d < b.length && b[at + d] === 1 && b[at + 2 * d] === 0) {
        b[at] = 0;
        b[at + d] = 0;
        at += 2 * d;
        b[at] = 1;
        out.add(keyOfArray(b, base));
      }
    }
  }
  return [[...L], [...R]];
}

// Splitting a row into independent parts.
//
// Give a stone on square x the weight φ^(x − b), where b is the rightmost
// stone and φ is the golden ratio. A jump to the right (x−2 over x−1 to x)
// keeps the total weight, since φ^x = φ^(x−1) + φ^(x−2); a jump to the left
// lowers it. A finite row has total weight below φ^0 + φ^−1 + φ^−2 + … = φ²,
// which is exactly the weight of a stone on b + 2, so no sequence of jumps can
// ever put a stone more than one square beyond the row's ends (the 1-D case of
// Conway's soldiers). Colours play no part: with both players moving, every
// physical jump is available to someone.
//
// So a left part reaches at most one square past its last stone, and only if
// some sequence of jumps gets a stone there. When the reaches of two
// neighbouring parts stay two squares apart, no stone of one can ever jump, be
// jumped by or block a stone of the other, and the row is their disjunctive sum.

const advMemo = new Map<string, boolean>();

/** Can some sequence of jumps (by either player) put a stone right of the last one? */
export function advancesRight(bits: string): boolean {
  const hit = advMemo.get(bits);
  if (hit !== undefined) return hit;
  const occ = new Set<number>();
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') occ.add(i);
  const last = bits.length - 1;
  let r = false;
  for (const player of ['L', 'R'] as const) {
    for (const m of movesOn(occ, player)) {
      if (m.to > last) { r = true; break; }
      const next = apply(occ, m);
      // a row whose last stone is gone can reach at most up to `last` again
      if (!next.has(last)) continue;
      const lo = Math.min(...next);
      let nb = '';
      for (let x = lo; x <= last; x++) nb += next.has(x) ? '1' : '0';
      if (advancesRight(nb)) { r = true; break; }
    }
    if (r) break;
  }
  advMemo.set(bits, r);
  return r;
}

export const advancesLeft = (bits: string) => advancesRight([...bits].reverse().join(''));

const splitMemo = new Map<string, Placed[]>();

const bitsOf = (cells: readonly number[]) => keyOf(cells).slice(1);

/** The position as a list of independent parts (a single part when it does not split). */
export function split(key: string): Placed[] {
  const hit = splitMemo.get(key);
  if (hit) return hit;
  const cells = cellsOf(key);
  // maximal runs of stones
  const groups: number[][] = [];
  for (const x of cells) {
    const g = groups[groups.length - 1];
    if (g && g[g.length - 1] === x - 1) g.push(x);
    else groups.push([x]);
  }
  for (let i = 0; i + 1 < groups.length; ) {
    const a = groups[i];
    const b = groups[i + 1];
    const right = a[a.length - 1] + (advancesRight(bitsOf(a)) ? 1 : 0);
    const left = b[0] - (advancesLeft(bitsOf(b)) ? 1 : 0);
    if (right + 2 <= left) i++;
    else {
      groups.splice(i, 2, [...a, ...b]);
      i = Math.max(0, i - 1);
    }
  }
  const res = groups.length > 1 ? groups.map((g) => place(g)) : [{ key, shift: 0 }];
  splitMemo.set(key, res);
  return res;
}

/**
 * A representative of the position up to symmetry, and whether its value is
 * the negative of the position's. Shifting a row by one square swaps the colour
 * of every stone, which negates the value; reversing it keeps every colour (the
 * parity of −x is that of x), which keeps the value.
 */
export function canonical(key: string): [string, boolean] {
  if (key === '') return ['', false];
  const p = key.charCodeAt(0) - 48;
  const bits = key.slice(1);
  const rev = [...bits].reverse().join('');
  const pr = (p + bits.length - 1) % 2;
  return rev < bits ? ['0' + rev, pr === 1] : ['0' + bits, p === 1];
}

const valueMemo = new Map<string, GameId>();

/** The canonical value of a position. */
export function value(key: string): GameId {
  const [k, flip] = canonical(key);
  const g = value0(k);
  return flip ? neg(g) : g;
}

function value0(key: string): GameId {
  const hit = valueMemo.get(key);
  if (hit !== undefined) return hit;
  const parts = split(key);
  let g: GameId;
  if (parts.length > 1) {
    g = sum(parts.map((p) => value(p.key)));
  } else {
    const [L, R] = options(key);
    g = make(L.map(value), R.map(value));
  }
  valueMemo.set(key, g);
  return g;
}

const wholeMemo = new Map<string, GameId>();

/** The same value computed on the whole row, never split (the control for `split`). */
export function valueWhole(key: string): GameId {
  const hit = wholeMemo.get(key);
  if (hit !== undefined) return hit;
  const [L, R] = options(key);
  const g = make(L.map(valueWhole), R.map(valueWhole));
  wholeMemo.set(key, g);
  return g;
}

export const positionCount = () => valueMemo.size;

/**
 * Chan and Tsai's S(a, b, …): solid alternating runs of the given lengths,
 * separated by single empty squares (or by `gaps[i]` empty squares), starting
 * with a white stone on square 0.
 */
export function pattern(lengths: readonly number[], gaps: readonly number[] = []): string {
  const cells: number[] = [];
  let at = 0;
  lengths.forEach((n, i) => {
    for (let k = 0; k < n; k++) cells.push(at + k);
    at += n + (gaps[i] ?? 1);
  });
  return keyOf(cells);
}

/** ◦ • · notation of a key. */
export function show(key: string): string {
  if (key === '') return '(empty)';
  const p = key.charCodeAt(0) - 48;
  let s = '';
  for (let i = 1; i < key.length; i++) {
    if (key[i] === '0') s += '·';
    else s += isBlackSquare(p + i - 1) ? '●' : '○';
  }
  return s;
}
