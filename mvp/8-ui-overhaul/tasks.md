---
id: rb-ui-overhaul
feature: 8-ui-overhaul
branch: feat/8-ui-overhaul
status: draft
created: 2026-09-10
---

# Tasks — UI overhaul

Each task ends green on `npm test` and `npm run lint`. Commit subjects carry
`[rb-ui-overhaul]`.

- **T1** `src/waveform/range.ts`: `MIN_PX_PER_S`, `detailSpanS(width)`, span as
  a parameter to `nextDetailRange`, `LONG_CLIP_S` and `DETAIL_SPAN_S` gone.
  Update `test/range.test.ts`, including the `width === 0` case.
- **T2** `src/ui/tick.ts`: `tickPositionsInRange(timesS, offsetS, range, width)`
  and its tests. `tickX` unchanged.
- **T3** `src/ui/useElementSize.ts`: the `ResizeObserver` hook.
- **T4** `src/ui/WaveformCanvas.tsx`: take `width` and `height` as props, drop
  the observer, draw the marks between the dim and the handles.
- **T5** `src/ui/WaveformBlock.tsx`: measure both wrappers, derive the span,
  hold the snap, release it on `pointerdown`, accept `marks`.
- **T6** `src/ui/ResultView.tsx` is the number, the unit, the count and the
  octave note. Delete `src/ui/ResultWaveform.tsx`.
- **T7** `src/ui/theme.ts` + `test/theme.test.ts`: the three values, the
  storage key, the `data-theme` and `color-scheme` writes, dark when absent.
- **T8** `src/ui/palette.ts`: watch `data-theme` with a `MutationObserver`
  beside the existing colour-scheme listener.
- **T9** i18n: five keys in `en.ts` and all sixteen bundles; `dir` on the root
  element; bidi isolation of interpolated values for right-to-left languages.
- **T10** `src/ui/Settings.tsx` and the trigger button; `LanguagePicker.tsx`
  reduced to its `<select>`.
- **T11** `src/index.css`: dark-first tokens, the grid and its areas, the
  breakpoint, `--col`, `--dim`, the 8 px inset, logical properties throughout.
- **T12** `src/ui/InputScreen.tsx`: grid areas, marks passed down, the settings
  button in the source row.
- **T13** Playwright pass in laptop Chrome at 360×640, 390×844, 430×932,
  820×1180 and all four rotations: upload, crop drag, play, Calculate, the snap
  and the way back out, both themes, Urdu.
- **T14** `review.md` for the phase.

Scope check before calling the phase done: `git log main..feat/8-ui-overhaul`.
