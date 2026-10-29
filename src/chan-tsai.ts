// The formulas and conjectures of Chan and Tsai, "1×n Konane: A Summary of
// Results" (More Games of No Chance, 2002), and the two theorems they quote.
// Each claim returns the value it predicts, or null where it says nothing.

import { type GameId, add, nimber, numberGame, upMultiple } from './cgt.ts';
import { pattern, value } from './konane.ts';

const kStar = (k: number) => nimber(k % 2); // k·* = * when k is odd, 0 when even
const plus = (x: number, g: GameId) => add(numberGame(x), g);

/** S(a, b, …) with single gaps, white stone first. */
export const S = (...lengths: number[]) => value(pattern(lengths.filter((n) => n > 0)));

/** S(k, m··, n): two empty squares before the third run. */
export const S2gap = (k: number, m: number, n: number) => value(pattern([k, m, n], [1, 2]));

export interface Claim {
  id: string;
  /** what the paper says, in its own words as far as possible */
  statement: string;
  /** the argument tuples to check */
  domain: (N: number) => number[][];
  predict: (...xs: number[]) => GameId | null;
  actual: (...xs: number[]) => GameId;
}

const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const tuples2 = (N: number) => range(1, N).flatMap((a) => range(1, N).map((b) => [a, b]));
const tuples3 = (N: number) => range(1, N).flatMap((a) => range(1, N).flatMap((b) => range(1, N).map((c) => [a, b, c])));

export const CLAIMS: Claim[] = [
  {
    id: 'ernst',
    statement: 'Ernst 1995: S(2k+1) = k, S(2k) = k·*',
    domain: (N) => range(1, N).map((n) => [n]),
    predict: (n) => (n % 2 ? numberGame((n - 1) / 2) : kStar(n / 2)),
    actual: (n) => S(n),
  },
  {
    id: 'scott-odd-odd',
    statement: 'Scott 1999: S(2j+1, 2k+1) = j + k',
    domain: (N) => tuples2(N).filter(([a, b]) => a % 2 === 1 && b % 2 === 1),
    predict: (a, b) => numberGame((a - 1) / 2 + (b - 1) / 2),
    actual: (a, b) => S(a, b),
  },
  {
    id: 'scott-odd-even',
    statement: 'Scott 1999: S(2j+1, 2k) = k·↑ + k·* if j = 0; j − k if j > k; 2^(j−k−1) otherwise',
    domain: (N) => tuples2(N).filter(([a, b]) => a % 2 === 1 && b % 2 === 0),
    predict: (a, b) => {
      const j = (a - 1) / 2;
      const k = b / 2;
      if (j === 0) return add(upMultiple(k), kStar(k));
      return numberGame(j > k ? j - k : 2 ** (j - k - 1));
    },
    actual: (a, b) => S(a, b),
  },
  {
    id: 'scott-even-even',
    statement: 'Scott 1999, j ≤ k: S(2j, 2k) = j + k·* if j < k; k if j = k, k even; (k−1) if j = k, k odd',
    domain: (N) => tuples2(N).filter(([a, b]) => a % 2 === 0 && b % 2 === 0 && a <= b),
    predict: (a, b) => {
      const j = a / 2;
      const k = b / 2;
      if (j < k) return plus(j, kStar(k));
      return numberGame(k % 2 === 0 ? k : k - 1);
    },
    actual: (a, b) => S(a, b),
  },
  {
    id: 'ooo',
    statement: 'Table 1 text: S(2i+1, 2j+1, 2k+1) = i + j + k',
    domain: (N) => tuples3(N).filter((t) => t.every((x) => x % 2 === 1)),
    predict: (a, b, c) => numberGame((a - 1) / 2 + (b - 1) / 2 + (c - 1) / 2),
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'oee',
    statement: 'Conjecture (Table 2): S(2i+1, 2j, 2k) = (j+i) + k·* if k ≥ 2j; k + i − j if i > j and k < 2j',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 1 && b % 2 === 0 && c % 2 === 0),
    predict: (a, b, c) => {
      const [i, j, k] = [(a - 1) / 2, b / 2, c / 2];
      if (k >= 2 * j) return plus(j + i, kStar(k));
      if (i > j && k < 2 * j) return numberGame(k + i - j);
      return null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eoe',
    statement: 'Table 4 text: if i, k ≥ j, S(2i, 2j+1, 2k) = (j+1) + (k+i)·*',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 2 === 1 && c % 2 === 0),
    predict: (a, b, c) => {
      const [i, j, k] = [a / 2, (b - 1) / 2, c / 2];
      return i >= j && k >= j ? plus(j + 1, kStar(k + i)) : null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eoe-shifted',
    statement: 'Table 4 text with the condition moved to i, k ≥ j + 2',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 2 === 1 && c % 2 === 0),
    predict: (a, b, c) => {
      const [i, j, k] = [a / 2, (b - 1) / 2, c / 2];
      return i >= j + 2 && k >= j + 2 ? plus(j + 1, kStar(k + i)) : null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'oeo-printed',
    statement: 'Table 5/6 text, i ≤ k read as printed: 0 if i = k (S(1,2,1) = *2); −2^(−k−1) for 2k+1 = 2i+3 … 2i+1+j; −k beyond',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 1 && b % 2 === 0 && c % 2 === 1 && a <= c),
    predict: (a, b, c) => {
      const [i, j, k] = [(a - 1) / 2, b / 2, (c - 1) / 2];
      if (i === k) return a === 1 && b === 2 ? nimber(2) : numberGame(0);
      if (c >= 2 * i + 3 && c <= 2 * i + 1 + j) return numberGame(-(2 ** (-k - 1)));
      if (c > 2 * i + 1 + j) return numberGame(-k);
      return null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'oeo-read',
    statement: 'Tables 5/6 as drawn, d = k − i ≥ 0: 0 if d = 0 (S(1,2,1) = *2); −2^(d−j−1) for 1 ≤ d ≤ j; −(d − j) for d > j',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 1 && b % 2 === 0 && c % 2 === 1 && a <= c),
    predict: (a, b, c) => {
      const [i, j, k] = [(a - 1) / 2, b / 2, (c - 1) / 2];
      const d = k - i;
      if (d === 0) return a === 1 && b === 2 ? nimber(2) : numberGame(0);
      return numberGame(d <= j ? -(2 ** (d - j - 1)) : -(d - j));
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eee-2mod4',
    statement: 'EEE, 2j ≡ 2 (mod 4), j > 1, k ≥ i: (i−k) + j·* if i, k < j; (j−k−1) if k = j, i < j; (j−k) + k·* if exactly one of i, k > j',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 4 === 2 && b > 2 && c % 2 === 0 && a <= c),
    predict: (a, b, c) => {
      const [i, j, k] = [a / 2, b / 2, c / 2];
      if (i < j && k < j) return plus(i - k, kStar(j));
      if (k === j && i < j) return numberGame(j - k - 1);
      if ((k > j) !== (i > j)) return plus(j - k, kStar(k));
      return null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eee-2mod4-conj',
    statement: 'Conjecture, 2j ≡ 2 (mod 4): for i, k > j, S(2i, 2j, 2k) = S(2(i−j), 2, 2(k−j))',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 4 === 2 && b > 2 && c % 2 === 0 && a > b && c > b),
    predict: (a, b, c) => S(a - b, 2, c - b),
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eee-0mod4',
    statement: 'EEE, 2j ≡ 0 (mod 4), j > 2 (as printed), k ≥ i: i − k if i, k < j; (j−k) + k·* if i < j < k',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 4 === 0 && b > 4 && c % 2 === 0 && a <= c),
    predict: (a, b, c) => {
      const [i, j, k] = [a / 2, b / 2, c / 2];
      if (i < j && k < j) return numberGame(i - k);
      if (i < j && k > j) return plus(j - k, kStar(k));
      return null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eee-0mod4-conj',
    statement: 'Conjecture, 2j ≡ 0 (mod 4): if i, k > j, S(2i, 2j, 2k) = S(2(i−j), 4, 2(k−j))',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 4 === 0 && b > 4 && c % 2 === 0 && a > b && c > b),
    predict: (a, b, c) => S(a - b, 4, c - b),
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eee-2mod4-read',
    statement: 'EEE, 2j ≡ 2 (mod 4), j > 1, k ≥ i, read from Table 7: (i−k) + * if i, k < j; i − j + 1 if k = j > i; (i−j) + k·* if i < j < k',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 4 === 2 && b > 2 && c % 2 === 0 && a <= c),
    predict: (a, b, c) => {
      const [i, j, k] = [a / 2, b / 2, c / 2];
      if (i < j && k < j) return plus(i - k, kStar(j));
      if (k === j && i < j) return numberGame(i - j + 1);
      if (i < j && j < k) return plus(i - j, kStar(k));
      return null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eee-0mod4-read',
    statement: 'EEE, 2j ≡ 0 (mod 4), j > 2, k ≥ i, read from Table 8: i − k if i, k ≤ j; (i−j) + k·* if i < j < k',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && b % 4 === 0 && b > 4 && c % 2 === 0 && a <= c),
    predict: (a, b, c) => {
      const [i, j, k] = [a / 2, b / 2, c / 2];
      if (i <= j && k <= j) return numberGame(i - k);
      if (i < j && j < k) return plus(i - j, kStar(k));
      return null;
    },
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'eee-shift-read',
    statement: 'Both EEE conjectures with the shift read off the tables: for i, k ≥ j, S(2i, 2j, 2k) = S(2i − 2j + 2, 2, 2k − 2j + 2) (2j ≡ 2 mod 4, j > 1) or S(2i − 2j + 4, 4, 2k − 2j + 4) (2j ≡ 0 mod 4, j > 2)',
    domain: (N) => tuples3(N).filter(([a, b, c]) => a % 2 === 0 && c % 2 === 0 && a >= b && c >= b && ((b % 4 === 2 && b > 2) || (b % 4 === 0 && b > 4))),
    predict: (a, b, c) => (b % 4 === 2 ? S(a - b + 2, 2, c - b + 2) : S(a - b + 4, 4, c - b + 4)),
    actual: (a, b, c) => S(a, b, c),
  },
  {
    id: 'decomposition',
    statement: 'Conjecture: S(k, m··, n) = S(k, m) + (third run as it lies), except S(2j, 2j··, 2k) with j odd',
    domain: (N) => tuples3(N),
    predict: (k, m, n) => {
      if (k % 2 === 0 && m === k && (k / 2) % 2 === 1 && n % 2 === 0) return null;
      // the third run starts on square k + 1 + m + 2; an odd square holds a black stone
      const third = value(pattern([n], []).replace(/^0/, String((k + m + 3) % 2)));
      return add(S(k, m), third);
    },
    actual: (k, m, n) => S2gap(k, m, n),
  },
  {
    id: 'decomposition-exceptions',
    statement: 'The excepted family S(2j, 2j··, 2k), j odd: does it really fail to decompose?',
    domain: (N) => tuples3(N).filter(([k, m, n]) => k % 2 === 0 && m === k && (k / 2) % 2 === 1 && n % 2 === 0),
    predict: (k, m, n) => add(S(k, m), value(pattern([n], []).replace(/^0/, String((k + m + 3) % 2)))),
    actual: (k, m, n) => S2gap(k, m, n),
  },
];
