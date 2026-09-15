---
id: rb-styling
feature: styling
branch: feat/styling
status: closed
created: 2026-09-13
closed: 2026-09-13
---

# Review — Styling the app by hand

A pure refactor: the app must not have changed in appearance or behaviour. So
the review is a comparison, not an inspection. Two dev servers were run side by
side — `19b4189` from a worktree on 5174, `feat/styling` on 5173 — and driven
by the same scripts against both.

The harness is in `evidence/`: `shoot.mjs` captures, `diff.mjs` compares
pixel for pixel, `e2e.mjs` drives the app and prints what it did, `rtl.mjs`
does the Urdu pass, `probe.mjs` dumps element geometry. All take `URL=`.

## Screens

Four, as asked, all in laptop Chrome:

| | |
|---|---|
| mobile portrait | 390 × 844 |
| mobile landscape | 844 × 390 |
| tablet portrait | 820 × 1180 |
| tablet landscape | 1180 × 820 |

## 1. Appearance — 40 frames, pixel for pixel

Five states per screen in dark (empty, samples sheet, settings sheet, loaded,
range open, result) and three in light, captured before any change and again
with the whole app converted.

```
$ node diff.mjs before after
IDENTICAL — all frames match
```

- [x] **R1** Every one of the 40 frames is byte-for-byte identical. Not "close"
      — `pixelmatch` reports zero differing pixels at threshold 0.1.
- [x] maintainer

Two drifts were found this way and fixed before the commits landed, which is
the whole reason for doing it as a diff rather than by eye:

- The button's label sat a fraction of a pixel off, because Tailwind's
  `text-base` also sets a 1.5 line-height and the rule it replaced set only the
  size. 116 pixels on one frame; invisible, and it would have been wrong
  everywhere a button label wrapped. Now `text-base/[normal]`.
- The landscape layout moved 4 px. That one turned out not to be my mistake —
  see finding F1.

## 2. Behaviour — the same script against both servers

`e2e.mjs` loads a sample through the sheet, drags a crop handle, plays, stops,
calculates, opens the range panel, switches the theme, and closes a sheet by
pressing the backdrop — on each of the four screens, collecting console errors
throughout. Full output in `evidence/e2e-report.txt`.

```
$ URL=http://localhost:5174/ node e2e.mjs > before.txt   # 19b4189
$ node e2e.mjs > after.txt                                # feat/styling
$ diff before.txt after.txt
E2E REPORTS IDENTICAL
```

- [x] **R2** Sample loads through the sheet; status reads
      `Loaded: sample-1.m4a · 11.2 seconds`.
- [x] **R3** Crop drag works and the readout follows: `0:02.8 - 0:10.0 · 7.2 s`.
- [x] **R4** Playback starts and the button becomes Stop.
- [x] **R5** Calculate on the cropped window gives `1614 rpm`,
      `96 combustions marked` — the same numbers on both builds, so the DSP
      path is untouched.
- [x] **R6** The expected-range panel opens and the choice is written to
      `localStorage` as `true`.
- [x] **R7** Theme switch: `data-theme` becomes `light`, `--color-accent`
      resolves to `#1f4e79`, the body ground to `rgb(250, 250, 250)`. This is
      also the check that requirement 7 survived — that value is read off the
      root element exactly as the canvas reads it.
- [x] **R8** A press on the backdrop closes the sheet, and a press inside it
      does not.
- [x] **R9** No console errors and no page errors, on any screen, on either
      build.
- [x] maintainer

## 3. Right to left

- [x] **R10** The Urdu build, captured on all four screens before and after:
      `IDENTICAL — all frames match`.
- [x] **R11** Horizontal overflow is 0 px on all four screens. This is the
      check the design called for, because Tailwind's `w-*` and `h-*` are
      physical where the old stylesheet used `inline-size` and `block-size`.
      `px-*` and `mx-*` are logical and were safe; the sizes that changed are
      all on elements where the writing mode never differs.
- [x] maintainer

## 4. The numbers

- [x] **R12** `npm run build`, `npm run lint`, `npm test` all green.
- [x] **R13** Bundle: 85.05 kB gzipped → **92.71 kB**, so **+7.66 kB** against
      the 15 kB budget in requirement 9. The spike predicted +7.1 kB.
- [x] **R14** `src/index.css`: **69 rules → 3**. What is left is the Tailwind
      layers, the palette import, two named breakpoints, `:root`'s
      `color-scheme` and font, `box-sizing` and `body`.
- [x] **R15** No component references a class defined anywhere else: grepping
      the source for any of the old class names returns nothing, and no colour
      token survives under its old name.
- [x] **R16** The release APK builds and is signed with the `rpmboss` key.
- [x] **R17** Installed and used on a phone, by the maintainer.
- [x] maintainer

## Findings

All four actionable findings were applied on 2026-09-13, after the maintainer
read them, as `3064987`. F5 and F6 were informational and needed no change.
What each one says below is what was found; what was done about it follows.

### F1 — Two rules in the old stylesheet never applied

**What.** The split-layout block set `.range { padding-block: 6px }` and
`.result { gap: 8px }`. Further down the same file, plain `.range { padding: 8px
12px }` and `.result { gap: 12px }` sat at equal specificity and later in source
order, so they won. Both overrides were dead.

**How it surfaced.** Written as `split:` variants they applied for the first
time, and the landscape frames moved by 4 px. `probe.mjs` located it exactly:
the range box lost 4 px of height and its summary moved 2 px within it, which
is 8 px of padding becoming 6.

**What I did.** Reproduced what the app *rendered*, not what the stylesheet
appeared to ask for, and left a comment at each site saying so. The refactor
must not change the screen, and this would have.

**Decided: applied.** `split:py-1.5` and `split:gap-2` are back, deliberately
this time. The landscape range panel and result gap tighten by 4 px, and that
is the only intended visual change in the branch — twelve landscape frames
differ from the benchmark and every other frame is identical.

### F2 — The two breakpoints are each written twice

`@custom-variant split` and `@custom-variant tall` live in `index.css`, and
`InputScreen`'s `SCREEN` block writes the same two media queries out in full,
because a `css` block cannot use a Tailwind variant. Four places, two values.

**Applied.** `src/ui/breakpoints.ts` holds the two queries and `InputScreen`
interpolates them. The `@custom-variant` declarations still have to be written
in CSS, which nothing in TypeScript can read, so `test/breakpoints.test.ts`
reads `index.css` and fails if the two ever drift apart.

### F3 — The one-line status paragraph is shaped in two components

`m-0 min-h-[1.5em]` plus a colour appears as `LINE` in `StatusLine` and twice
inline in `ResultView`. Three declarations, two files.

**Applied.** `StatusText` sits in `kit.tsx` beside `Button` and `Sheet`, with a
`tone` of default, muted or error. The `split:truncate` rule and the note
saying why errors are exempt from it moved into it.

### F4 — `Button` and `LinkButton` accept a `className` and silently ignore it

Their props extend `ButtonHTMLAttributes`, which includes `className`, and the
spread sits *before* the computed `className`, so a caller that passes one gets
no error and no effect. The design's rule — that a caller wanting an override
should get a prop instead — is currently enforced by convention.

**Applied.** Both button types, and `StatusText`, omit `className` from their
props. The design's rule is now the type's rule.

### F5 — The test count moved from 324 to 325, benignly

There is a guard test that walks `src/ui/*.tsx` asserting no bare user-facing
strings. Adding `kit.tsx` added a case, and it passes. Noted only because the
PRD and tasks quoted 327, which came from a measurement taken on the live POC
branch and was wrong for `main`; both docs now say 324.

### F6 — Pre-existing audit advisories, untouched

`npm audit` reports three moderate advisories reaching `uuid` through
`@capacitor/cli` → `xcode`. They predate this branch and the suggested fix is a
breaking Capacitor CLI downgrade. Not this feature's business; flagged so it is
not mistaken for something this work introduced.

## Closing

Checked again after the findings were applied, in headed Chrome this time
rather than headless — the two render text differently, so the benchmark was
re-captured headed rather than compared across modes. Every frame identical
except the twelve landscape ones F1 deliberately changes, and the e2e report
diffs clean. 328 tests pass.

The maintainer has ticked every check, including the phone.

Closed 2026-09-13. Merged to `main` in stage 7.
