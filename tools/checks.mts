// Check every claim in src/chan-tsai.ts on every argument tuple up to N,
// smallest rows first, writing runs/checks.json as it goes.
//   node tools/checks.mts [N] [deadline-seconds] [out-name] [claim-id,…]
import { writeFileSync, renameSync } from 'node:fs';
import { CLAIMS } from '../src/chan-tsai.ts';
import { name } from '../src/cgt.ts';
import { positionCount } from '../src/konane.ts';

const N = Number(process.argv[2] ?? 14);
const deadline = Date.now() + Number(process.argv[3] ?? 1800) * 1000;
const started = Date.now();
const file = `runs/${process.argv[4] ?? 'checks'}.json`;
const only = process.argv[5]?.split(',');
type Row = { args: number[]; predicted: string; actual: string };
const out: Record<string, { statement: string; N: number; checked: number; holds: number; fails: number; silent: number; failures: Row[]; complete: boolean }> = {};
const save = () => {
  writeFileSync(file + '.tmp', JSON.stringify({ N, elapsedMs: Date.now() - started, positions: positionCount(), claims: out }, null, 1));
  renameSync(file + '.tmp', file);
};
for (const c of CLAIMS.filter((x) => !only || only.includes(x.id))) {
  const dom = c.domain(N).sort((a, b) => a.reduce((s, x) => s + x, 0) - b.reduce((s, x) => s + x, 0));
  const r = (out[c.id] = { statement: c.statement, N, checked: 0, holds: 0, fails: 0, silent: 0, failures: [] as Row[], complete: false as boolean });
  let i = 0;
  for (const xs of dom) {
    if (Date.now() > deadline) break;
    const p = c.predict(...xs);
    if (p === null) { r.silent++; i++; continue; }
    const a = c.actual(...xs);
    r.checked++;
    if (a === p) r.holds++;
    else { r.fails++; r.failures.push({ args: xs, predicted: name(p), actual: name(a) }); }
    if (++i % 50 === 0) save();
  }
  r.complete = i === dom.length;
  save();
  console.log(`${c.id}\tchecked ${r.checked}\tholds ${r.holds}\tfails ${r.fails}\tsilent ${r.silent}${r.complete ? '' : ' (cut)'}\t${Date.now() - started}ms`);
}
save();
