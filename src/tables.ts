// The layout of Chan and Tsai's Tables 1–8: one table per middle length m,
// first lengths k down the side and last lengths n along the top.

export interface TableSpec {
  /** paper's table number */
  table: number;
  parity: string;
  m: number;
  ks: number[];
  ns: number[];
}

const odd = [1, 3, 5, 7, 9, 11, 13];
const even = [2, 4, 6, 8, 10, 12, 14];

export const TABLES: TableSpec[] = [
  { table: 1, parity: 'odd-odd-odd', m: 3, ks: odd, ns: odd },
  { table: 1, parity: 'odd-odd-odd', m: 5, ks: odd, ns: odd },
  { table: 2, parity: 'odd-even-even', m: 4, ks: odd, ns: even },
  { table: 2, parity: 'odd-even-even', m: 6, ks: odd, ns: even },
  { table: 3, parity: 'odd-odd-even', m: 3, ks: odd, ns: [0, ...even] },
  { table: 3, parity: 'odd-odd-even', m: 5, ks: odd, ns: [0, ...even] },
  { table: 4, parity: 'even-odd-even', m: 3, ks: even, ns: even },
  { table: 4, parity: 'even-odd-even', m: 5, ks: even, ns: even },
  { table: 4, parity: 'even-odd-even', m: 7, ks: even, ns: even },
  { table: 5, parity: 'odd-even-odd', m: 2, ks: odd, ns: odd },
  { table: 6, parity: 'odd-even-odd', m: 4, ks: odd, ns: odd },
  { table: 7, parity: 'even-even-even', m: 2, ks: even, ns: even },
  { table: 7, parity: 'even-even-even', m: 6, ks: even, ns: even },
  { table: 8, parity: 'even-even-even', m: 4, ks: even, ns: even },
  { table: 8, parity: 'even-even-even', m: 8, ks: even, ns: even },
];

export const cellId = (k: number, m: number, n: number) => `${k},${m},${n}`;
