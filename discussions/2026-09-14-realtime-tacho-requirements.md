# Realtime tachometer — requirements for the PRD

*2026-09-14. Feature: realtime tachometer (`feat/realtime-tacho`). Third of the
day, after [layout and visualization libraries](2026-09-14-realtime-tacho-layout-and-viz-libs.md)
and [range and detection limits](2026-09-14-tacho-range-and-detection-limits.md).*

## Summary

The behaviour of the live screen, written down for the PRD. The shape is a
resting state and a running one: the app opens with the dial at zero, the
reading showing `---`, and a large Start button filling the live-waveform
section. Pressing it takes the microphone — listening, not recording — and the
three parts come alive at once: the button's section becomes the oscilloscope,
the needle follows the estimate, the line under the dial reads rpm. Stopping
returns everything to rest. Most of the session went on the edges rather than
the happy path: where the stop control lives in each orientation, what happens
to the other source buttons while the microphone is held, and what the screen
shows when the estimator has nothing to say — which, with a 600 rpm floor and a
confidence threshold, is a real state and not an edge case. That last question
resolved into two user settings rather than one decision, and the settings modal
grew a collapsible section to hold them.

## Key conclusions

### Resting state

- The tachometer is visible from app start, needle at 0.
- The rpm result line reads `---`.
- The live-waveform section holds a large Start button filling its full height.

### Running state

- Start takes microphone access without recording; the section becomes the live
  waveform, the needle follows the value, the result line shows rpm.
- **Stop button, portrait:** to the right of the settings button in the source
  row, twice as wide as an icon button, with a stop icon.
- **Stop button, landscape:** under the source row, the full width of that row.
- **Record, Open and Sample are disabled while live mode runs.** Stopping
  removes the stop button and re-enables them.
- Microphone refusal uses the existing error styling and placement — the line
  above the status.
- The needle is interpolated between readings, not stepped: `WINDOW_S = 1` gives
  a reading roughly every second while the scope redraws at 60 fps.

### When there is no estimate

Engine off, too quiet, below the 600 rpm floor, or under the confidence
threshold. Two settings rather than one answer:

- **Fallback:** drop to 0, or hold the last value. **Default: fall to 0.**
- **Motion:** smooth, or jump/step between values. **Default: smooth.**

Both persist in localStorage, the same mechanism the theme uses.

### Settings modal

- The modal gains a border.
- Under the theme section: a horizontal divider, then a collapsible section
  headed "Tachometer settings", **collapsed by default** — the header is the
  only thing visible when closed.
- Inside, two rows, each a label and a dropdown/picker on the same row.
- All strings translated into all seventeen languages, like everything else.

### Styling

- Tachometer range as decided: 0–12,000 rpm, redline from 9,000.
- Tachometer and live waveform are deliberately minimal for now; refinement is a
  later feature.
- The live waveform's styling matches the recorded waveform's.

## Open questions

- The theme section stays a bare section while the tachometer section collapses.
  Either is fine, but the PRD should say it is deliberate.
- Does the app keep listening when backgrounded, or release the microphone on
  `pause`?
- Is there a maximum session length, or does live mode run until stopped?
- Does the live path assume four-stroke (`REVS_PER_PULSE = 2`) like the batch
  path, and what happens when the 2-stroke preset eventually lands?
- Does opening a file or a sample while live runs stop live mode, or is it
  simply unreachable because those buttons are disabled?

## Ideas to realize

- Build the resting state first: dial at 0, `---` reading, full-height Start
  button in the waveform section.
- Wire Start to microphone access without recording, switching all three parts
  of the stage into their running state together.
- Place the stop control per orientation: beside the settings button in
  portrait (double-width, stop icon), full-width under the source row in
  landscape.
- Disable Record, Open and Sample for the duration of live mode, re-enabling on
  stop.
- Reuse the existing error line, styling and placement for microphone refusal.
- Interpolate the needle between one-second readings so motion is smooth at
  60 fps.
- Add a "no estimate" fallback setting — drop to 0 (default) or hold the last
  value.
- Add a needle-motion setting — smooth (default) or step.
- Persist both in localStorage alongside the theme.
- Give the settings modal a border.
- Add a divider under the theme section, then a collapsible "Tachometer
  settings" section, closed by default, with label + picker rows.
- Translate every new string into all seventeen languages.
- Match the live waveform's styling to the recorded waveform's, and keep both
  the gauge and the scope minimal until the styling-refinement feature.
