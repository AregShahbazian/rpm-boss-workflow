---
id: rb-analysis
feature: 4-analysis
branch: feat/4-analysis
status: draft
created: 2026-09-10
depends_on: [3-waveform-crop]
---

# PRD — Analysis

## Goal

Turn the cropped window into one RPM number, and produce the combustion
positions that phase 5 will draw on the waveform.

## Why

This is the feature. Everything before it exists to hand the analysis a clean
window; everything after it presents the answer. The method is already settled
and validated offline against seven recordings (`audio/combustion-counts.md`),
so this phase is a port with a test suite, not a research project.

The port is the risky part: an IIR filter, an envelope and an autocorrelation
written by hand in TypeScript can be subtly wrong and still return a
plausible-looking number. The fixtures are what stop that, which is why they
were built in phase 1 rather than here.

## User stories

1. As a user, I press Calculate and see one RPM number for the window I chose.
2. As a user who knows roughly what the engine idles at, I type a range and the
   app stops telling me half or double the real figure.
3. As a user whose recording was too noisy to read, I get told so, rather than
   a confident wrong number.

## Scope

### In

- **DSP module** in `src/dsp/`, pure functions over `Float32Array`, no DOM, no
  React, runnable in Node. Ported from the scipy reference in [`mvp.md`](../../mvp.md):
  Butterworth bandpass 60-2000 Hz, full-wave rectify, 150 Hz lowpass envelope,
  autocorrelation per 1 s window over the lag range 8-100 pulses/s, median
  across windows.
- **Peak counting** as the cross-check, the reference's method A
  (`distance = 0.6 * sr / rate`, `prominence = 0.5 * std`). It also yields the
  combustion sample positions.
- **Result shape:** pulses per second, the derived RPM, and the combustion
  positions in seconds. Phase 5 consumes the positions; nothing draws them yet.
- **Four-stroke single only.** RPM = pulses/s x 60 x 2, the two revolutions per
  combustion of a 4-stroke. The factor stays a named constant so the 2-stroke
  preset can be added later without touching the DSP.
- **Expected range**, two optional number fields, min and max RPM. When both
  are filled, the estimate is compared against its own half and double, and the
  candidate inside the range wins. Empty fields change nothing.
- **Worker:** the analysis runs in a Web Worker so the UI never blocks, with
  the same module imported directly under test.
- **Calculate button**, enabled only with a clip loaded, showing a busy state
  while the worker runs.
- **Failure path:** when no periodicity is found in the lag range, a message in
  the `audio/types.ts` style, kept out of component internals so phase 7 can
  extract it.
- **Minimal display:** the number as plain text under the button, deliberately
  unstyled. Phase 5 owns the result view.

### Out

- The result view, the large number, the marked waveform (phase 5).
- The 4-stroke / 2-stroke preset toggle, moved to the backlog on 2026-09-10:
  there is no 2-stroke recording to validate against, so shipping the toggle
  would ship an untested path.
- Multi-cylinder presets, firing-order awareness, noise reduction, adaptive
  band selection. All backlog.
- Any change to the crop UI or the `AudioClip` contract.
- Storing or naming results.

## Acceptance criteria

1. A Node test runs the DSP module over all seven fixtures in `test/fixtures/`
   and every one lands inside its `toleranceRpm` in `expected.json`.
2. The two estimators agree within 3 % on all seven fixtures, as they do in the
   reference table.
3. Unit tests cover each stage as a pure function: filter response, envelope,
   autocorrelation lag pick, peak positions, and the pulses-to-RPM conversion.
4. In the browser, loading a fixture, cropping and pressing Calculate shows a
   number matching the test suite for that window, within one second on the
   phone.
5. An expected range of 1300-1700 applied to a clip that reads 800 yields
   ~1600; with no range, the same clip still reads 800.
6. A clip with no engine in it produces the failure message, not a number.
7. The DSP module imports nothing from `src/ui/`, `src/state/` or the DOM.
8. `npm test`, `npm run lint` and `npm run build` pass.

## Non-goals and constraints

- No DSP library. Hand-written, per the stack decision in [`mvp.md`](../../mvp.md).
- The filter must be deterministic across Node and the browser; no reliance on
  `AudioContext` for filtering.
- Output is one number, never a range. The expected range is an input only.
- Analysis is triggered by Calculate alone. It does not re-run while the crop
  window is dragged.

## Open questions

- **Is a 1 s window enough for the autocorrelation?** Carried from phase 3,
  section E. `MIN_CLIP_S` in `audio/types.ts` is one constant doing two jobs:
  the smallest crop window, and the gate that rejects a clip at load. They stay
  coupled — a clip too short to fill the smallest window can never be analysed,
  so refusing it at load is better than accepting it and failing at Calculate.
  The plan for the design stage:
  1. Truncate the fixtures to 1.0, 1.5, 2.0, 3.0 and 5.0 s and find the
     shortest window that still lands inside tolerance. That measurement sets
     the constant; it may well stay at 1 s. The same sweep answers the other
     half of the question: the reference ran on whole files of 6-16 s and we
     cap at 10 s, so it also shows whether accuracy degrades near the short
     end of the allowed range.
  2. If it rises, make the too-short message derive from the constant. It is a
     fixed string hardcoding "at least 1 second" today, so raising the number
     silently makes the message lie. Templating it also gives phase 7 an
     interpolation case, which is what a naive extraction pass misses.
  3. Record the measurement in `design.md`, not only the number that came out
     of it.
  Known cost: recordings between 1 s and any new floor stop loading at all.
  Against a 10 s recording budget that is a narrow band, and a clip that short
  was never going to give a stable reading.
- **Does the failure path need a confidence threshold**, or is "no peak in the
  lag range" enough to catch bad audio? Design decides; a tunable threshold
  risks becoming a knob nobody can set.
