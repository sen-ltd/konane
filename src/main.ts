import './style.css';
import { keyOf, cellsOf, movesOn, apply, value, split, pattern, isBlackSquare, type Move, type Player } from './konane.ts';
import { type GameId, name, outcome, isNumber, numberValue, formatNumber, leftOptions, rightOptions, stops } from './cgt.ts';
import findings from './findings.json';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const svg = $<HTMLElement>('board') as unknown as SVGSVGElement;
const statusEl = $('status');
const presetSel = $<HTMLSelectElement>('presetSel');
const youSel = $<HTMLSelectElement>('youSel');
const firstSel = $<HTMLSelectElement>('firstSel');
const hintsBox = $<HTMLInputElement>('hints');
const modeBtn = $<HTMLButtonElement>('mode');
const palette = $('palette');
const rowText = $<HTMLInputElement>('rowText');

const MAX_LEN = 34;
const ROW_RE = /^[x.]*$/;
const NS = 'http://www.w3.org/2000/svg';

/** 'x' for a stone, '.' for an empty square; character i is square i, and square 0 is white. */
const rowOf = (cells: Iterable<number>) => {
  const xs = [...cells];
  const n = xs.length ? Math.max(...xs) + 1 : 0;
  return Array.from({ length: n }, (_, i) => (xs.includes(i) ? 'x' : '.')).join('');
};
const cellsOfRow = (r: string) => [...r].flatMap((c, i) => (c === 'x' ? [i] : []));
const S = (...lens: number[]) => rowOf(cellsOf(pattern(lens)));

interface Preset { id: string; label: string; row: string; first: Player }
const PRESETS: Preset[] = [
  { id: 't2', label: 'S(5, 6, 6): the paper says 17/4, it is 13/4', row: S(5, 6, 6), first: 'L' },
  { id: 't7', label: 'S(10, 2, 14): the paper says +1/64, it is −1/64', row: S(10, 2, 14), first: 'L' },
  { id: 't8', label: 'S(12, 4, 14): the paper says −1/16, it is −1/64', row: S(12, 4, 14), first: 'R' },
  { id: 'star2', label: 'S(1, 2, 1) = *2', row: S(1, 2, 1), first: 'L' },
  { id: 'up', label: 'S(1, 6, 2) = 1 + 3·↑*', row: S(1, 6, 2), first: 'L' },
  { id: 'eoe', label: 'S(2, 3, 2) = 0, not the 2 the text predicts', row: S(2, 3, 2), first: 'L' },
  { id: 'gap2', label: 'S(2, 2··, 4): two gaps, still not a sum', row: rowOf(cellsOf(pattern([2, 2, 4], [1, 2]))), first: 'L' },
  { id: 'gap3', label: 'Three empty squares always split a row', row: 'xxxxx...xxxx', first: 'L' },
  { id: 'solid', label: 'S(9) = 4: a solid run (Ernst)', row: S(9), first: 'R' },
  { id: 'oeo', label: 'S(3, 4, 7) = −1/2 (Table 6)', row: S(3, 4, 7), first: 'L' },
];

let initialRow = PRESETS[0].row;
let occ = new Set<number>();
let lo = 0;
let hi = 0;
let toMove: Player = 'L';
let history: { occ: Set<number>; toMove: Player }[] = [];
let you: Player = 'L';
let editing = false;
let selected: number | null = null;
let cpuTimer = 0;

const other = (p: Player): Player => (p === 'L' ? 'R' : 'L');
const who = (p: Player) => (p === 'L' ? '<strong>Black</strong>' : '<strong>White</strong>');

/** Does the player who just made this move win (the opponent moves next)? */
function moverWins(m: Move, mover: Player): boolean {
  const o = outcome(value(keyOf(apply(occ, m))));
  return o === 'P' || o === mover;
}

function load(r: string, first: Player): void {
  window.clearTimeout(cpuTimer);
  initialRow = r;
  occ = new Set(cellsOfRow(r));
  const xs = [...occ];
  // no sequence of jumps takes a stone more than one square past either end (see konane.ts)
  lo = xs.length ? Math.min(...xs) - 1 : 0;
  hi = xs.length ? Math.max(...xs) + 1 : 8;
  toMove = first;
  firstSel.value = first;
  history = [];
  selected = null;
  render();
  maybeCpu();
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

const C = 34;
const TOP = 40;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, val] of Object.entries(attrs)) e.setAttribute(k, String(val));
  parent.appendChild(e);
  return e;
}

function drawBoard(): void {
  svg.innerHTML = '';
  const first = editing ? 0 : lo;
  const last = editing ? Math.max(MAX_LEN - 1, hi) : hi;
  const n = last - first + 1;
  const width = Math.max(560, 40 + n * C);
  const height = TOP + C + 56;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const x0 = (width - n * C) / 2;
  const X = (sq: number) => x0 + (sq - first) * C;
  const human = !editing && toMove === you;
  const mine = human ? movesOn(occ, toMove) : [];
  const fromSel = selected === null ? [] : mine.filter((m) => m.from === selected);
  const captured = new Set(fromSel.flatMap((m) => m.captured));

  // independent parts of the row
  if (!editing && occ.size) {
    const key = keyOf(occ);
    const parts = split(key);
    if (parts.length > 1) {
      const minOcc = Math.min(...occ);
      const frame = minOcc - (key.charCodeAt(0) - 48);
      for (const p of parts) {
        const cs = cellsOf(p.key).map((c) => c + p.shift + frame);
        const a = Math.min(...cs);
        const b = Math.max(...cs);
        el('rect', { class: 'part', x: X(a) + 2, y: TOP - 6, width: (b - a + 1) * C - 4, height: C + 12, rx: 8 }, svg);
        const t = el('text', { class: 'partv', x: (X(a) + X(b) + C) / 2, y: TOP + C + 40 }, svg);
        t.textContent = short(value(p.key), 18);
      }
    }
  }

  for (let sq = first; sq <= last; sq++) {
    const x = X(sq);
    const cell = el('rect', { class: `sq${isBlackSquare(sq) ? ' dark' : ''}`, x, y: TOP, width: C, height: C }, svg);
    if (editing) cell.addEventListener('click', () => toggle(sq));
    const idx = el('text', { class: 'idx', x: x + C / 2, y: TOP + C + 18 }, svg);
    idx.textContent = String(sq);
    if (!occ.has(sq)) continue;
    const movable = mine.some((m) => m.from === sq);
    const cls = ['stone', isBlackSquare(sq) ? 'B' : 'W'];
    if (movable) cls.push('movable');
    if (sq === selected) cls.push('selected');
    if (captured.has(sq)) cls.push('cap');
    const s = el('circle', { class: cls.join(' '), cx: x + C / 2, cy: TOP + C / 2, r: C / 2 - 5 }, svg);
    if (movable) s.addEventListener('click', () => { selected = selected === sq ? null : sq; render(); });
  }
  for (const m of fromSel) drawTarget(m, X(m.to));
  if (!editing && occ.size === 0) {
    const t = el('text', { class: 'empty', x: width / 2, y: TOP + C / 2 + 5 }, svg);
    t.textContent = 'no stones left';
  }
}

function drawTarget(m: Move, x: number): void {
  const g = el('g', { class: 'target', role: 'button', 'aria-label': `jump to square ${m.to}` }, svg);
  const win = moverWins(m, toMove);
  if (hintsBox.checked) g.classList.add(win ? 'win' : 'lose');
  el('circle', { cx: x + C / 2, cy: TOP + C / 2, r: C / 2 - 5 }, g);
  const t = el('text', { x: x + C / 2, y: TOP + C / 2 + 5 }, g);
  t.textContent = hintsBox.checked ? (win ? '✓' : '✗') : '•';
  g.addEventListener('click', () => play(m));
}

function play(m: Move): void {
  window.clearTimeout(cpuTimer);
  history.push({ occ, toMove });
  occ = apply(occ, m);
  toMove = other(toMove);
  selected = null;
  render();
  maybeCpu();
}

function maybeCpu(): void {
  if (editing || toMove === you) return;
  const ms = movesOn(occ, toMove);
  if (ms.length === 0) return;
  cpuTimer = window.setTimeout(() => {
    const winning = ms.filter((m) => moverWins(m, toMove));
    const pool = winning.length ? winning : ms;
    play(pool[Math.floor(Math.random() * pool.length)]);
  }, 600);
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

function toggle(sq: number): void {
  if (occ.has(sq)) occ.delete(sq);
  else occ.add(sq);
  setRow(rowOf(occ));
}

function setRow(r: string): void {
  occ = new Set(cellsOfRow(r));
  initialRow = r;
  history = [];
  rowText.value = r;
  render();
}

function randomRow(): string {
  const lens = Array.from({ length: 3 }, () => 1 + Math.floor(Math.random() * 7));
  return rowOf(cellsOf(pattern(lens, [1, 1 + Math.floor(Math.random() * 2)])));
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

function short(g: GameId, max = 160): string {
  const s = name(g);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function describe(g: GameId): string {
  if (isNumber(g)) {
    const x = numberValue(g);
    if (x === 0) return 'Zero: the player to move loses.';
    return `A number: ${x > 0 ? 'Black' : 'White'} is ${formatNumber(Math.abs(x))} free move${Math.abs(x) === 1 ? '' : 's'} ahead and wins whoever starts.`;
  }
  const [ls, rs] = stops(g);
  if (ls === rs) return `${formatNumber(ls)} plus an infinitesimal (a ↑, a * or a nimber): the stops agree, and who wins is decided by the tiny part.`;
  return `A hot game: both players want to move. Left stop ${formatNumber(ls)}, right stop ${formatNumber(rs)}.`;
}

function renderValue(): void {
  const key = keyOf(occ);
  const g = value(key);
  const o = outcome(g);
  const verdict = {
    L: `${who('L')} wins whoever moves first.`,
    R: `${who('R')} wins whoever moves first.`,
    P: 'The player to move loses.',
    N: 'The player to move wins.',
  }[o];
  const nm = short(g, 400);
  const opts = `{ ${leftOptions(g).map((x) => short(x, 40)).join(', ')} | ${rightOptions(g).map((x) => short(x, 40)).join(', ')} }`;
  const parts = occ.size ? split(key) : [];
  const partList = parts.length > 1
    ? `<p class="small dim">The row splits into ${parts.length} independent parts (dashed on the board); its value is their sum:</p>
       <ul class="parts">${parts.map((p) => `<li><b>${short(value(p.key), 40)}</b> &nbsp;${p.key.length - 1} squares</li>`).join('')}</ul>`
    : '';
  $('value').innerHTML = `
    <div class="big${nm.length > 28 ? ' long' : ''}">${nm}</div>
    <p class="verdict">${verdict}</p>
    <p class="small dim">${describe(g)}</p>
    ${!isNumber(g) && nm !== opts ? `<p class="small dim">canonical form <span class="mono">${opts.length > 220 ? opts.slice(0, 219) + '…' : opts}</span></p>` : ''}
    ${partList}
    <p class="small dim">row <span class="mono">${rowOf(occ) || '∅'}</span> · ${occ.size} stone${occ.size === 1 ? '' : 's'}</p>`;
}

function renderPaper(): void {
  const mark = (s: string) => (s === 'ok' ? '<span class="ok">✓</span>' : s === 'no' ? '<span class="no">✗</span>' : '<span class="info">ℹ</span>');
  const order = { no: 0, ok: 1, info: 2 } as Record<string, number>;
  $('paper').innerHTML = `<ul>${[...findings.items]
    .sort((a, b) => order[a.status] - order[b.status])
    .map((f) => `<li>${mark(f.status)}<strong>${f.title}</strong><span class="d">${f.detail}</span></li>`)
    .join('')}</ul><p class="small dim">${findings.footer}</p>`;
}

function renderStatus(): void {
  if (editing) {
    statusEl.innerHTML = `Editing: <code>${rowOf(occ) || '∅'}</code>. Click squares to place or remove stones, then press <strong>Play</strong>.`;
    return;
  }
  const ms = movesOn(occ, toMove);
  if (ms.length === 0) {
    statusEl.innerHTML = `${who(toMove)} has no jump and loses. ${toMove === you ? 'The computer wins.' : 'You win.'}`;
    return;
  }
  const wins = ms.filter((m) => moverWins(m, toMove)).length;
  const turn = toMove === you ? (selected === null ? 'Your move: pick a stone' : 'Pick where it lands') : 'Computer thinking';
  statusEl.innerHTML = `${turn} — ${who(toMove)} to move. ${hintsBox.checked ? `${wins} of ${ms.length} jumps win.` : ''}`;
}

function render(): void {
  document.body.classList.toggle('editing', editing);
  palette.hidden = !editing;
  modeBtn.textContent = editing ? 'Play' : 'Edit';
  drawBoard();
  renderValue();
  renderStatus();
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

presetSel.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
renderPaper();
presetSel.addEventListener('change', () => {
  const p = PRESETS.find((pp) => pp.id === presetSel.value)!;
  editing = false;
  load(p.row, p.first);
});
youSel.addEventListener('change', () => {
  you = youSel.value as Player;
  window.clearTimeout(cpuTimer);
  selected = null;
  render();
  maybeCpu();
});
firstSel.addEventListener('change', () => load(initialRow, firstSel.value as Player));
hintsBox.addEventListener('change', render);
$('undo').addEventListener('click', () => {
  window.clearTimeout(cpuTimer);
  while (history.length) {
    const h = history.pop()!;
    occ = h.occ;
    toMove = h.toMove;
    if (toMove === you) break;
  }
  selected = null;
  render();
  maybeCpu();
});
$('restart').addEventListener('click', () => load(initialRow, firstSel.value as Player));
modeBtn.addEventListener('click', () => {
  editing = !editing;
  window.clearTimeout(cpuTimer);
  selected = null;
  if (editing) {
    // a stone may have jumped left of square 0; shift by an even amount to keep every colour
    const min = occ.size ? Math.min(...occ) : 0;
    const sh = min < 0 ? 2 * Math.ceil(-min / 2) : 0;
    setRow(rowOf([...occ].map((x) => x + sh)));
  } else load(rowOf(occ), firstSel.value as Player);
});
$('clear').addEventListener('click', () => setRow(''));
$('random').addEventListener('click', () => setRow(randomRow()));
$('setText').addEventListener('click', () => {
  const r = rowText.value.trim().toLowerCase();
  const ok = ROW_RE.test(r) && r.length <= MAX_LEN;
  rowText.classList.toggle('bad', !ok);
  if (ok) setRow(r);
});

// ?row=xxxx.xx&first=R deep-links a position; ?preset=t7 picks a preset
const q = new URLSearchParams(location.search);
const qr = (q.get('row') ?? '').toLowerCase();
const qp = PRESETS.find((p) => p.id === q.get('preset'));
if (qr && ROW_RE.test(qr) && qr.length <= MAX_LEN) load(qr, q.get('first') === 'R' ? 'R' : 'L');
else if (qp) { presetSel.value = qp.id; load(qp.row, qp.first); }
else load(PRESETS[0].row, PRESETS[0].first);
if (q.get('select')) { selected = Number(q.get('select')); render(); }
