// Compute every cell of Chan and Tsai's Tables 1–8, smallest rows first, and
// write runs/tables.json after each cell so a run cut short keeps what it has.
//   node tools/sweep.mts [deadline-seconds]
import { writeFileSync, renameSync } from 'node:fs';
import { value, pattern, positionCount } from '../src/konane.ts';
import { name } from '../src/cgt.ts';
import { TABLES, cellId } from '../src/tables.ts';

const deadline = Date.now() + Number(process.argv[2] ?? 3600) * 1000;
const cells = new Map<string, [number, number, number]>();
for (const t of TABLES) for (const k of t.ks) for (const n of t.ns) cells.set(cellId(k, t.m, n), [k, t.m, n]);
const order = [...cells.values()].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]) || a[1] - b[1]);

const out: Record<string, { value: string; ms: number; positions: number }> = {};
const started = Date.now();
let stopped = false;
for (const [k, m, n] of order) {
  if (Date.now() > deadline) { stopped = true; break; }
  const t = Date.now();
  const v = name(value(pattern(n === 0 ? [k, m] : [k, m, n])));
  out[cellId(k, m, n)] = { value: v, ms: Date.now() - t, positions: positionCount() };
  const doc = { cells: out, done: Object.keys(out).length, total: order.length, elapsedMs: Date.now() - started, stopped: false };
  writeFileSync('runs/tables.json.tmp', JSON.stringify(doc, null, 1));
  renameSync('runs/tables.json.tmp', 'runs/tables.json');
  console.log(`${cellId(k, m, n)}\t${v}\t${Date.now() - t}ms\t${positionCount()}`);
}
const doc = { cells: out, done: Object.keys(out).length, total: order.length, elapsedMs: Date.now() - started, stopped };
writeFileSync('runs/tables.json', JSON.stringify(doc, null, 1));
console.log(`done ${doc.done}/${doc.total} in ${doc.elapsedMs} ms${stopped ? ' (deadline)' : ''}`);
