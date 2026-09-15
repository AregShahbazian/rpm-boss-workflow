---
id: rb-result-view
feature: 5-result-view
branch: feat/5-result-view
status: draft
created: 2026-09-10
---

# Tasks — Result view

Each task ends green on `npm test` and `npm run lint`. Commit subjects carry
`[rb-result-view]`.

- **T1** `src/ui/tick.ts`: the pure placement helper and its test. Tick x from
  a pulse time, the window length and the canvas width, clamped to the canvas.
- **T2** `src/ui/ResultWaveform.tsx`: canvas of the analysed window with ticks
  top and bottom, palette read once per colour scheme, `computePeaks` reused.
- **T3** `src/ui/ResultView.tsx`: the number, the unit, the combustion count,
  the octave note, and the failure message in the number's place. Delete
  `ResultLine.tsx`.
- **T4** Wire into `InputScreen`, passing the window clip, and scroll the
  result into view when it arrives.
- **T5** Styles: display figure with tabular numerals and a four-digit minimum
  width, both colour schemes.
- **T6** `analysis.fixtures.test.ts`: mark count within 5 % of
  `pulsesPerS * durationS` on all seven fixtures (AC 1).
- **T7** Playwright pass in laptop Chrome at phone width: each fixture reads
  its expected number; ticks line up with the visible pulses; the count matches;
  moving the crop clears both; an unreadable clip shows the message with the
  crop still usable; a range-corrected result says so; light and dark.
- **T8** `review.md` for the phase.

Scope check before calling the phase done: `git log main..feat/5-result-view`.
