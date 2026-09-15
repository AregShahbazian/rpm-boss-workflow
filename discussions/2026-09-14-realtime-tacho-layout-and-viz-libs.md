# Realtime tachometer — layout, and whether to use a visualization library

*2026-09-14. Feature: realtime tachometer (backlog → `feat/realtime-tacho`).*

## Summary

The session opened the "realtime tachometer" backlog item, built the layout the
feature will live in, and then asked whether the two things that fill it — the
gauge and the live waveform — should come from a library. The layout landed
first: the idle status sentence was deleted, a `LiveStage` placeholder now takes
all the space under the source row when nothing is loaded, and in landscape it
occupies the column the waveform has when a clip *is* loaded, so the screen does
not change shape when a recording arrives. The control column was resized to its
contents in the process, because Record lost its label and four icon buttons need
a third of the clamp that was reserved for two labelled ones. On the library
question the answer was homegrown for both, and the reasoning is the interesting
part: every mainstream React gauge is a d3 + SVG component that re-renders
through React per value, which is the wrong shape for a 30–60 fps needle in a
Capacitor WebView and several times the size of the whole current bundle.

## Key conclusions

- **The gauge is hand-drawn on canvas.** A tachometer is arcs, ticks and a
  needle — roughly a hundred lines against the 2D context, with the palette
  already readable via `usePalette` and sizing via `useElementSize`. The three
  candidates were `react-gauge-component` (depends on full `d3` ^7, the most
  customizable of them), `react-d3-speedometer` (nine d3 packages plus
  `lodash-es`, React 19-ready, ~20 k weekly downloads, but segment colouring is
  coarse and its `d3-transition` animation fights a live feed) and
  `react-gauge-chart` (d3 ^7, least maintained). All three cost ~70 kB+ before
  styling, and all three would have to be fought to look like this app.
- **The live waveform is hand-drawn too, and already exists.**
  `poc/live-rpm`'s `LiveScope.tsx` is a canvas oscilloscope on
  `requestAnimationFrame` that auto-scales against a noise floor, reusing
  `usePalette` and `useElementSize`. No library draws a scrolling ring buffer
  well.
- **`poc/live-rpm` is the design phase's input, not its starting branch.** It
  carries `src/live/ring.ts`, `src/live/stream.ts`, `src/state/useLive.ts`,
  `LiveScope.tsx`, `LiveScreen.tsx` and native `RawAudioPlugin` changes. The maintainer
  was explicit: inspiration for design, not yet to be merged or built on.
- **The stage's proportions are settled**: 80 % tachometer over 20 % live
  waveform, and inside the tachometer 80 % gauge over 20 % rpm reading, the
  reading divided by a line rather than boxed off. Styling of that reading
  follows the existing calculate result.
- **Customization the gauge must support**: ui style, rpm range, and a redline
  section. All three are trivial as canvas arcs and are the reason the library
  route buys nothing.

## Open questions

- Style target for the dial: skeuomorphic with ticks, or a minimal arc closer to
  the app's current flat look?
- Does the needle smooth/sweep, or follow the estimator's raw output?
- The rpm reading strip is ~20 % of the stage; the calculate result's figure is
  `clamp(3rem, 12vmin, 6rem)`. On a laptop the two do not agree and the live
  figure likely needs its own size.
- Whether the live path reuses the batch estimator or the PoC's own, and what
  the redline default is when no expected range has been entered.

## Ideas to realize

- Draw the tachometer as a canvas component (arcs, ticks, needle) taking
  props for rpm range, redline start, and a style variant — no d3, no SVG
  component library.
- Port `LiveScope.tsx` from `poc/live-rpm` as the live waveform in the bottom
  fifth of the stage, keeping its auto-scaling and noise floor.
- Give the live rpm reading its own type scale rather than inheriting the
  calculate result's `clamp(3rem, 12vmin, 6rem)`.
- Let the redline section default from the expected-range fields when they are
  filled, tying the existing backlog item "expected-range presets per vehicle"
  to the live view.
- Revisit `LiveStage`'s dashed placeholders: they are scaffolding and must go
  when the real components land.
