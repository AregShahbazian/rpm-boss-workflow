---
id: rb-analysis
feature: 4-analysis
branch: feat/4-analysis
status: draft
created: 2026-09-10
---

# Tasks — Analysis

Ordered so the DSP is provably right before anything renders it. Each task
ends green on `npm test` and `npm run lint`. Commit subjects carry
`[rb-analysis]`.

- **T1** Export the Python baseline. Commit `scripts/reference/` with the
  scipy implementation and the fixture sweep, and `test/fixtures/reference.json`
  holding each fixture's pulses per second. Everything after this is checked
  against it.
- **T2** `src/dsp/biquad.ts`. Second-order section design at Q = 1/√2 for
  highpass and lowpass, and zero-phase application with odd extension at the
  edges. Tests against the scipy coefficients and the magnitude response.
- **T3** `src/dsp/envelope.ts`. Highpass 60, lowpass 2000, rectify, lowpass
  150. Tests on a synthetic pulse train, including that a symmetric input stays
  symmetric.
- **T4** `src/dsp/autocorr.ts`. Per-window rate with parabolic refinement,
  window confidence, medians across windows. Tests on synthetic rates including
  one falling between two sample lags.
- **T5** `src/dsp/pulses.ts`. Peak positions with spacing and prominence as
  scipy defines them. Tests on hand-built inputs.
- **T6** `src/dsp/analyse.ts` and `src/dsp/types.ts`. Orchestration, the RPM
  conversion behind `REVS_PER_PULSE`, octave resolution against the expected
  range, and the failure union. Tests for the octave table and both codes.
- **T7** `test/analysis.fixtures.test.ts`. All seven fixtures inside
  `toleranceRpm`, the two estimators within 3 %, and each rate within 1 % of
  `reference.json`. **This is the gate**: nothing below starts until it is
  green.
- **T8** Raise `MIN_CLIP_S` to 2 in `audio/types.ts` and make the too-short
  message derive from it rather than hardcoding "at least 1 second". Update the
  phase 3 tests that assert the 1 s boundary.
- **T9** `src/analysis/worker.ts` and `client.ts`. Transfer the samples, return
  the result union, one client instance reused across runs.
- **T10** `src/state/useAnalysis.ts`. Run states, cancellation of an in-flight
  run, reset to idle when the clip or selection changes.
- **T11** UI: range fields, Calculate button with its busy state, the result
  line, wired to `getWindowClip()` which phase 3 left unconsumed.
- **T12** Playwright pass in laptop Chrome: load a fixture, crop, Calculate,
  read the number; check it against the test suite; flip the range fields to
  force an octave correction; upload a non-engine file and see the failure
  message; confirm the number clears when the window moves.
- **T13** `review.md` for the phase, carrying the B3 boundary change from
  phase 3 and whatever T12 turned up.

Scope check before calling the phase done: `git log main..feat/4-analysis`.
