// Every row of up to 13 squares, valued with and without splitting it into parts.
import { writeFileSync } from 'node:fs';
import { value, valueWhole, split } from '../src/konane.ts';

const maxLen = 13;
let rows = 0, splitRows = 0, mismatches = 0;
for (let len = 1; len <= maxLen; len++) {
  for (let m = 0; m < 1 << len; m++) {
    if (!(m & 1) || !((m >> (len - 1)) & 1)) continue;
    for (const p of [0, 1]) {
      const k = String(p) + m.toString(2).padStart(len, '0');
      rows++;
      if (split(k).length > 1) splitRows++;
      if (value(k) !== valueWhole(k)) mismatches++;
    }
  }
}
writeFileSync('runs/control.json', JSON.stringify({ maxLen, rows, splitRows, mismatches }, null, 1));
console.log({ maxLen, rows, splitRows, mismatches });
