# 1×n Konane

Konane, the Hawaiian jumping game, on a single row, with an exact combinatorial-game-theory engine behind it. Black (Left) and White (Right) take turns jumping one of their stones over an adjacent enemy stone into the empty square beyond, removing the stone jumped; a stone may keep jumping in the same direction. Whoever cannot jump loses.

Every row gets its canonical value (numbers, ↑, nimbers, hot games), every landing square is marked as winning or losing, a computer plays the other side, any row of up to 34 squares can be drawn, and rows that split into independent parts show the parts and their values.

![1×n Konane](assets/screenshot.png)

The demo opens on S(5, 6, 6), a cell of Chan and Tsai's Table 2 that the paper prints as 17/4. It is 13/4.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173/portfolio/konane/
npm test           # 16 tests
npm run build      # static site in dist/
```

## How it works

- `src/konane.ts`: a stone only ever moves two squares, so its colour is the parity of its square (even = white, as in the paper) and a position is the set of occupied squares, stored as a parity bit plus a 0/1 string. Shifting by one square negates the value and reversing keeps it, so values are memoised on a canonical representative. `valueWhole` values a row without ever splitting it; it is the control for `split`.
- **Splitting a row.** Give a stone on square x the weight φ^x (φ the golden ratio). A jump to the right keeps the total weight (φ^x = φ^(x−1) + φ^(x−2)), a jump to the left lowers it, and a finite row weighs less than a single stone two squares past its last stone. So no sequence of jumps, by either player, ever lands a stone more than one square beyond the row (the 1-D case of Conway's soldiers). `advancesRight` decides whether some sequence reaches that one extra square; neighbouring runs whose reaches stay two squares apart can never touch, and the row is the sum of its parts. Three empty squares always split a row; one or two may or may not.
- `src/cgt.ts`: short games in canonical form, interned so equal values have equal ids; shared with the Hackenbush, Clobber and Toppling Dominoes entries.
- `src/chan-tsai.ts`: every formula and conjecture of the paper as code, plus the readings used below.
- `src/main.ts`: the demo; the side panel is `src/findings.json`.

## Checked against the literature

A. Chan and A. Tsai, *1×n Konane: A Summary of Results*, More Games of No Chance, MSRI Publications 42 (2002) 331–339. S(k, m, n) is three solid runs of k, m and n stones separated by single empty squares, starting with a white stone.

```sh
npm run verify     # all of the below, then src/findings.json and runs/summary.json
```

- `tools/sweep.mts`: all 749 cells of Tables 1–8 (15 sub-tables), smallest rows first, in about 40 s → `runs/tables.json`. The generated tables were compared with the rendered PDF pages by eye. 742 cells agree (the paper's "1↑3\*" is 1 + 3·↑ + \*). The other seven:

| cell | paper | computed |
|---|---|---|
| S(5, 6, 6) | 17/4 | 13/4 |
| S(5, 6, 8) | 9/2 | 17/4 |
| S(5, 6, 10) | 5 | 9/2 |
| S(10, 2, 14) | 1/64 | −1/64 |
| S(14, 2, 10) | 1/16 | 1/64 |
| S(12, 4, 14) | −1/16 | −1/64 |
| S(14, 4, 12) | 1/16 | 1/64 |

  Row 5 of Table 2 (m = 6) has lost its 13/4 and shifted left. Table 7's pair contradicts the paper's own S(2i, 2j, 2k) = −S(2k, 2j, 2i). `tools/disputes.mts` recomputes all seven on the whole, unsplit row and gets the same values (`runs/disputes.json`).

- `tools/checks.mts`: every claim on every argument tuple up to 14 → `runs/checks.json`, `runs/eee.json`.

| claim | holds |
|---|---|
| Ernst: S(2k+1) = k, S(2k) = k·\* | 14 / 14 |
| Scott: S(2j+1, 2k+1), S(2j+1, 2k), S(2j, 2k) | 49 / 49, 49 / 49, 28 / 28 |
| odd-odd-odd = i + j + k | 343 / 343 |
| odd-even-even conjecture | 137 / 137 |
| even-odd-even, "if i, k ≥ j" | 91 / 188 |
| … with i, k ≥ j + 2 | 91 / 91 |
| odd-even-odd, as printed | 61 / 196 |
| … read from Tables 5–6: −2^(d−j−1) for 1 ≤ d = k − i ≤ j, −(d − j) beyond | 196 / 196 |
| even-even-even, 2j ≡ 2 (mod 4), as printed | 41 / 68 |
| … with (i − j) + k·\* for i < j < k and i − j + 1 for k = j | 62 / 62 |
| even-even-even, 2j ≡ 0 (mod 4), as printed | 25 / 35 |
| … with (i − j) + k·\* for i < j < k | 45 / 45 |
| conjectures S(2(i−j), 2 or 4, 2(k−j)) | 16 / 20, 4 / 10 |
| … shifted to S(2i−2j+2, 2, 2k−2j+2) and S(2i−2j+4, 4, 2k−2j+4) | 55 / 55 |
| decomposition: S(k, m··, n) = S(k, m) + S(n), outside S(2j, 2j··, 2k), j odd | 2,662 / 2,716 |
| the stated exceptions really fail | 28 / 28 |

  The decomposition conjecture fails for every S(1, 2j··, 2k) up to 14 (49 cases), each of which equals the one-gap row S(1, 2j + 2k), and for S(3, 4··, 2k) with 2k ≥ 6 (5 cases).

- `tools/control.mts`: all 8,192 rows of up to 13 squares, valued with and without splitting: 0 differences (5,902 of them split).
- The tests also check outcomes against a plain win/lose search that never looks at values, and the one-square reach bound by exhaustive search on every row of up to 10 squares.

## License

MIT

<!-- sen-publish:links -->
## Links

- 🌐 Demo: https://sen.ltd/portfolio/konane/
- 📝 記事: https://qiita.com/sen-ltd/items/e40a9cc149a4668eb5e4
<!-- /sen-publish:links -->
