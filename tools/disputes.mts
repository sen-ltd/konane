// The cells where the computed tables and the paper disagree, recomputed on
// the whole row without splitting it into independent parts.
import { writeFileSync } from 'node:fs';
import { pattern, valueWhole, value } from '../src/konane.ts';
import { name } from '../src/cgt.ts';

const CELLS: { cell: number[]; paper: string; where: string }[] = [
  { cell: [5, 6, 6], paper: '17/4', where: 'Table 2, m = 6' },
  { cell: [5, 6, 8], paper: '9/2', where: 'Table 2, m = 6' },
  { cell: [5, 6, 10], paper: '5', where: 'Table 2, m = 6' },
  { cell: [10, 2, 14], paper: '1/64', where: 'Table 7, m = 2' },
  { cell: [14, 2, 10], paper: '1/16', where: 'Table 7, m = 2' },
  { cell: [12, 4, 14], paper: '−1/16', where: 'Table 8, m = 4' },
  { cell: [14, 4, 12], paper: '1/16', where: 'Table 8, m = 4' },
];
const out = [];
for (const c of CELLS) {
  const t = Date.now();
  const k = pattern(c.cell);
  const whole = name(valueWhole(k));
  const split = name(value(k));
  out.push({ ...c, whole, split, ms: Date.now() - t });
  console.log(c.cell.join(','), c.paper, whole, split, Date.now() - t, 'ms');
  writeFileSync('runs/disputes.json', JSON.stringify(out, null, 1));
}
