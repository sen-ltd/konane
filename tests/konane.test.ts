import { describe, expect, it } from 'vitest';
import {
  keyOf, cellsOf, movesOn, apply, options, value, valueWhole, split, canonical, pattern, advancesRight, show, type Player,
} from '../src/konane.ts';
import { name, neg, outcome, numberGame, nimber, add } from '../src/cgt.ts';
import { CLAIMS, S, S2gap } from '../src/chan-tsai.ts';

/** every row (both colourings) of exactly `len` squares with stones at both ends */
function* rows(maxLen: number): Generator<string> {
  for (let len = 1; len <= maxLen; len++)
    for (let m = 0; m < 1 << len; m++) {
      if (!(m & 1) || !((m >> (len - 1)) & 1)) continue;
      for (const p of ['0', '1']) yield p + m.toString(2).padStart(len, '0');
    }
}

/** win/lose by plain search, never looking at values: does the player to move win? */
const winMemo = new Map<string, boolean>();
function toMoveWins(key: string, p: Player): boolean {
  const k = key + p;
  const hit = winMemo.get(k);
  if (hit !== undefined) return hit;
  const [L, R] = options(key);
  const r = (p === 'L' ? L : R).some((o) => !toMoveWins(o, p === 'L' ? 'R' : 'L'));
  winMemo.set(k, r);
  return r;
}

describe('moves', () => {
  it('jumps over an adjacent stone into an empty square, and may stop or keep going', () => {
    // ○ ● · ● : white on 0 jumps 1 to land on 2, and may go on over 3 to 4
    const occ = new Set([0, 1, 3]);
    const w = movesOn(occ, 'R');
    expect(w.map((m) => `${m.from}>${m.to}`)).toEqual(['0>2', '0>4']);
    expect(w[1].captured).toEqual([1, 3]);
    expect(apply(occ, w[1])).toEqual(new Set([4]));
    // black on 1 jumps 0 leftwards; black on 3 has nothing adjacent
    expect(movesOn(occ, 'L').map((m) => `${m.from}>${m.to}`)).toEqual(['1>-1']);
    // a jump needs an empty landing square
    expect(movesOn(new Set([0, 1, 2]), 'R').map((m) => `${m.from}>${m.to}`).sort()).toEqual([]);
    expect(movesOn(new Set([0, 1, 2]), 'L').map((m) => `${m.from}>${m.to}`).sort()).toEqual(['1>-1', '1>3']);
  });

  it('shows rows in ○ ● · notation, white on even squares', () => {
    expect(show(pattern([4, 2], [1]))).toBe('○●○●·●○');
    expect(show(pattern([4, 2, 3], [1, 2]))).toBe('○●○●·●○··●○●');
  });
});

describe('values', () => {
  it('solid runs: S(2k+1) = k and S(2k) = k·* (Ernst)', () => {
    for (let n = 1; n <= 16; n++) expect(name(S(n))).toBe(n % 2 ? String((n - 1) / 2) : n % 4 === 2 ? '*' : '0');
  });

  it('S(1, 2, 1) = *2 and S(1, 6, 2) = 1 + 3·↑*', () => {
    expect(S(1, 2, 1)).toBe(nimber(2));
    expect(name(S(1, 6, 2))).toBe('1 + 3·↑*');
  });

  it('shifting a row by one square negates it, reversing it does not change it', () => {
    for (const k of rows(9)) {
      const flipped = (k[0] === '0' ? '1' : '0') + k.slice(1);
      expect(valueWhole(flipped)).toBe(neg(valueWhole(k)));
      const bits = k.slice(1);
      const rev = String((Number(k[0]) + bits.length - 1) % 2) + [...bits].reverse().join('');
      expect(valueWhole(rev)).toBe(valueWhole(k));
      expect(canonical(k)[0] <= '0' + bits || canonical(k)[0] <= '0' + [...bits].reverse().join('')).toBe(true);
    }
  });

  it('outcomes agree with a plain win/lose search that never looks at values', () => {
    for (const k of rows(10)) {
      const lFirst = toMoveWins(k, 'L');
      const rFirst = toMoveWins(k, 'R');
      const o = lFirst && rFirst ? 'N' : lFirst ? 'L' : rFirst ? 'R' : 'P';
      expect(outcome(value(k))).toBe(o);
    }
  });
});

describe('splitting a row into independent parts', () => {
  it('no sequence of jumps puts a stone more than one square past either end', () => {
    for (const k of rows(10)) {
      const cells = cellsOf(k);
      const lo = cells[0];
      const hi = cells[cells.length - 1];
      const seen = new Set<string>();
      const stack = [cells];
      let min = lo;
      let max = hi;
      while (stack.length) {
        const cs = stack.pop()!;
        const id = cs.join(',');
        if (seen.has(id)) continue;
        seen.add(id);
        const occ = new Set(cs);
        for (const p of ['L', 'R'] as const)
          for (const m of movesOn(occ, p)) {
            min = Math.min(min, m.to);
            max = Math.max(max, m.to);
            stack.push([...apply(occ, m)].sort((a, b) => a - b));
          }
      }
      expect(min).toBeGreaterThanOrEqual(lo - 1);
      expect(max).toBeLessThanOrEqual(hi + 1);
      expect(max > hi).toBe(advancesRight(k.slice(1)));
    }
  });

  it('the split value equals the whole-row value on every row of up to 11 squares', () => {
    let splits = 0;
    for (const k of rows(11)) {
      if (split(k).length > 1) splits++;
      expect(value(k)).toBe(valueWhole(k));
    }
    expect(splits).toBeGreaterThan(1000);
  });

  it('three empty squares always split a row', () => {
    expect(split(keyOf([0, 1, 2, 3, 4, 8, 9, 10, 11])).length).toBe(2);
    // two empty squares between solid runs do not
    expect(split(pattern([4, 4], [2])).length).toBe(1);
  });
});

describe('Chan and Tsai (2002)', () => {
  it('Table 1 and Table 5 samples', () => {
    expect(name(S(13, 5, 13))).toBe('14');
    expect(name(S(1, 2, 3))).toBe('−1/2');
    expect(name(S(3, 4, 7))).toBe('−1/2');
  });

  it('Table 2, m = 6, row 5: 13/4, 17/4, 9/2 where the paper prints 17/4, 9/2, 5', () => {
    expect([S(5, 6, 6), S(5, 6, 8), S(5, 6, 10)].map(name)).toEqual(['13/4', '17/4', '9/2']);
    expect(valueWhole(pattern([5, 6, 6]))).toBe(numberGame(13 / 4));
  });

  it('Table 7: S(10, 2, 14) = −1/64 = −S(14, 2, 10)', () => {
    expect(name(S(10, 2, 14))).toBe('−1/64');
    expect(S(14, 2, 10)).toBe(neg(S(10, 2, 14)));
  });

  it('Table 8: S(12, 4, 14) = −1/64, not −1/16', () => {
    expect(name(S(12, 4, 14))).toBe('−1/64');
  });

  it('the decomposition conjecture fails for S(1, 2j··, 2k), which is S(1, 2j + 2k)', () => {
    for (const [m, n] of [[2, 2], [2, 4], [4, 2], [6, 6]]) {
      expect(S2gap(1, m, n)).toBe(S(1, m + n));
      expect(S2gap(1, m, n)).not.toBe(add(S(1, m), S(n)));
    }
    // and holds for an ordinary case
    expect(S2gap(5, 3, 4)).toBe(add(S(5, 3), value(pattern([4]).replace(/^0/, '1'))));
  });

  it('the printed even-odd-even condition is too wide: S(2, 3, 2) = 0, not 2', () => {
    expect(name(S(2, 3, 2))).toBe('0');
  });

  it('the theorems and the read-off formulas hold on every row up to 8', () => {
    for (const id of ['ernst', 'scott-odd-odd', 'scott-odd-even', 'scott-even-even', 'ooo', 'oee', 'eoe-shifted', 'oeo-read', 'eee-2mod4-read', 'eee-0mod4-read', 'eee-shift-read']) {
      const c = CLAIMS.find((x) => x.id === id)!;
      for (const xs of c.domain(8)) {
        const p = c.predict(...xs);
        if (p !== null) expect([id, xs, name(c.actual(...xs))]).toEqual([id, xs, name(p)]);
      }
    }
  });
});
