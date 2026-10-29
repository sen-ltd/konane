// Turn runs/*.json into src/findings.json (the demo's side panel) and
// runs/summary.json (the numbers quoted in the README and the articles).
//   node tools/report.mts
import { readFileSync, writeFileSync } from 'node:fs';
import { S, S2gap } from '../src/chan-tsai.ts';

const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const tables = read('runs/tables.json');
const checks = { ...read('runs/checks.json').claims, ...read('runs/eee.json').claims };
const disputes: { cell: number[]; paper: string; where: string; whole: string; split: string }[] = read('runs/disputes.json');
const control = read('runs/control.json');

const c = (id: string) => checks[id];
const dec = c('decomposition');
const decFails: number[][] = dec.failures.map((f: { args: number[] }) => f.args);
const k1 = decFails.filter(([k]) => k === 1);
const other = decFails.filter(([k]) => k !== 1);
// S(1, 2j··, 2k) is the single-gap row S(1, 2j + 2k)
const k1Merged = k1.filter(([, m, n]) => S2gap(1, m, n) === S(1, m + n)).length;

const summary = {
  cells: tables.done,
  sweepMs: tables.elapsedMs,
  control,
  disputes,
  claims: Object.fromEntries(Object.entries(checks).map(([id, r]: [string, any]) => [id, { checked: r.checked, holds: r.holds, fails: r.fails, N: r.N }])),
  decomposition: { checked: dec.checked, fails: dec.fails, k1: k1.length, k1Merged, other },
};
writeFileSync('runs/summary.json', JSON.stringify(summary, null, 1));

const n = (id: string) => `${c(id).holds}/${c(id).checked}`;
const items = [
  { status: 'no', title: 'Table 2 (m = 6), row 5 is shifted', detail: `S(5, 6, 6), S(5, 6, 8), S(5, 6, 10) are 13/4, 17/4, 9/2; the paper prints 17/4, 9/2, 5, dropping 13/4. The whole row, never split, gives the same.` },
  { status: 'no', title: 'Table 7 (m = 2) breaks its own symmetry', detail: 'S(10, 2, 14) = −1/64 and S(14, 2, 10) = 1/64. The paper prints 1/64 and 1/16, which cannot both hold when S(2i, 2j, 2k) = −S(2k, 2j, 2i).' },
  { status: 'no', title: 'Table 8 (m = 4): ±1/16 should be ±1/64', detail: 'S(12, 4, 14) = −1/64 and S(14, 4, 12) = 1/64, not ∓1/16.' },
  { status: 'no', title: 'Decomposition conjecture: more exceptions', detail: `S(k, m··, n) = S(k, m) + S(n) holds in ${dec.holds} of ${dec.checked} cases up to 14 outside the stated family, but fails for every S(1, 2j··, 2k) (${k1.length} cases; each equals the one-gap row S(1, 2j + 2k)) and for S(3, 4··, 2k), 2k ≥ 6 (${other.length} cases).` },
  { status: 'ok', title: 'The stated exceptions S(2j, 2j··, 2k), j odd, really do not decompose', detail: `${c('decomposition-exceptions').fails} of ${c('decomposition-exceptions').checked} fail, as the paper says.` },
  { status: 'no', title: 'Even-odd-even: "if i, k ≥ j" is too wide', detail: `(j+1) + (k+i)·* fails in ${c('eoe').fails} of ${c('eoe').checked} cases; with i, k ≥ j + 2 it holds in ${n('eoe-shifted')}.` },
  { status: 'no', title: 'Odd-even-odd formula as printed', detail: `It assumes i ≥ k but then ranges over 2k+1 > 2i+1. Read off Tables 5 and 6 as −2^(d−j−1) (d = k − i ≤ j) and −(d − j) beyond, it holds in ${n('oeo-read')}.` },
  { status: 'no', title: 'Even-even-even formulas: (j − k) should be (i − j)', detail: `As printed they fail in ${c('eee-2mod4').fails}/${c('eee-2mod4').checked} and ${c('eee-0mod4').fails}/${c('eee-0mod4').checked} cases. With (i − j) + k·* for i < j < k and i − j + 1 for k = j they hold in ${n('eee-2mod4-read')} and ${n('eee-0mod4-read')}.` },
  { status: 'no', title: 'Even-even-even conjectures: the shift is off by one', detail: `S(2(i−j), 2, 2(k−j)) and S(2(i−j), 4, 2(k−j)) fail in ${c('eee-2mod4-conj').fails}/${c('eee-2mod4-conj').checked} and ${c('eee-0mod4-conj').fails}/${c('eee-0mod4-conj').checked}; S(2i−2j+2, 2, 2k−2j+2) and S(2i−2j+4, 4, 2k−2j+4) hold in ${n('eee-shift-read')}.` },
  { status: 'ok', title: `All other ${tables.done - 7} table cells agree`, detail: `${tables.done} cells in Tables 1–8 recomputed in ${(tables.elapsedMs / 1000).toFixed(0)} s; the paper's "1↑3*" is 1 + 3·↑ + *.` },
  { status: 'ok', title: 'Ernst: S(2k+1) = k, S(2k) = k·*', detail: `${n('ernst')} solid runs.` },
  { status: 'ok', title: "Scott's two-run formulas", detail: `S(2j+1, 2k+1) ${n('scott-odd-odd')}, S(2j+1, 2k) ${n('scott-odd-even')}, S(2j, 2k) ${n('scott-even-even')}.` },
  { status: 'ok', title: 'Odd-odd-odd = i + j + k; the odd-even-even conjecture', detail: `${n('ooo')} and ${n('oee')}.` },
  { status: 'info', title: 'Splitting the row', detail: `A golden-ratio weight shows no stone ever lands more than one square past the row, so parts whose reaches stay two squares apart are independent. Checked against the unsplit row on all ${control.rows} rows of up to ${control.maxLen} squares: ${control.mismatches} differences.` },
];
writeFileSync('src/findings.json', JSON.stringify({ items, footer: `All arguments up to 14 per run. Numbers from runs/*.json; regenerate with npm run verify.` }, null, 1) + '\n');
console.log(JSON.stringify(summary.decomposition), JSON.stringify(summary.claims, null, 0));
