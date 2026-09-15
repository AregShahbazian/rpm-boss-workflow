---
id: rb-result-view
feature: 5-result-view
branch: feat/5-result-view
status: draft
created: 2026-09-10
---

# Design — Result view

## 0. What was measured first

The PRD's three open questions all turn on how much room there is, so the room
was measured before anything was decided. Laptop Chrome, the current screen
with `all-samples.m4a` loaded, development-only controls subtracted:

| part | height |
|---|---|
| title, source buttons, status | 101 px |
| waveform block (overview + detail + readout) | 222 px |
| player | 48 px |
| expected range, collapsed | 43 px |
| Calculate | 48 px |
| result line | 24 px |
| gaps and page padding | 124 px |
| **total, production build** | **610 px** |

A phone at 740 CSS px tall has roughly 600 to 640 left after browser chrome.
So the screen is already full before this phase adds anything.

### 0.1 The result goes below, and the page scrolls

**The PRD's third acceptance criterion cannot hold as written.** A number and a
marked waveform are about 170 px together; nothing short of hiding the crop
makes that fit under 610 px.

Three ways out were considered.

- **Marks drawn into the existing crop canvas**, costing no height at all. It
  works for short clips and fails for long ones: on a 67 s clip the detail view
  spans 30 s, so a 10 s window is a third of the width and 130 marks land
  0.85 px apart, a smear.
- **The detail canvas swaps into a result mode**, same height, returning to
  crop mode on a tap. Fits, but introduces a mode, hides the crop behind a
  gesture, and makes "move the crop and try again" cost two.
- **The result sits below Calculate and the page scrolls**, with the result
  scrolled into view when it arrives.

**Decision: the third.** No modes, no hidden state, the crop stays where it
was, and the number and its marks are adjacent so they are on screen together
after the scroll. What is lost is seeing the crop at the same time as the
answer, which is not needed while reading it.

AC 3 is amended to: the number and the marked waveform are visible together
without further scrolling once the result arrives.

### 0.2 Marks are ticks, and all of them are drawn

Ten seconds at 13 pulses per second is 130 marks. At 448 px of canvas that is
one every 3.4 px, and at 360 px phone width one every 2.5 px.

Full-height lines at that spacing would erase the waveform. **Ticks along the
top and bottom edges, 10 px tall and 1 px wide**, leave the middle of the trace
clear while still showing the pattern.

**Every mark is drawn, none are thinned.** Regularity is the whole point: a
missed combustion or a doubled one shows up as a gap or a crowd in an otherwise
even comb, and thinning would hide exactly that. Where the comb is too dense to
count, the count is printed beside the number instead.

### 0.3 The octave note is not dismissable

One line, and it is the difference between a measured figure and a corrected
one. Nothing to gain by letting it be hidden.

## 1. Shape

```
src/ui/
  ResultView.tsx        the number, the note, the count, the failure message
  ResultWaveform.tsx    canvas: the analysed window with combustion ticks
```

`ResultLine.tsx` from phase 4 is replaced by `ResultView.tsx` and deleted. It
was scaffolding and said so.

No new state. `useAnalysis` already holds everything, and already clears on a
clip or window change, so the marks clear with the number for free.

## 2. The number

`Math.round(rpm)`, in a large plain figure with `rpm` beneath it in small
muted text, so the unit never competes with the value.

Tabular numerals and a fixed minimum width of four digits, so 998 and 1450 do
not shift the layout between runs. This is why the phase 3 `.mono` class exists;
it is reused rather than duplicated.

## 3. The marked waveform

A canvas of its own, 96 px tall, drawn once per result:

1. `computePeaks` over the window's samples, the same function the crop
   waveform uses. The window clip comes from `getWindowClip()`.
2. The trace in the muted colour, min to max per column, as phase 3 draws it.
3. A tick at the top and bottom edge for each `pulseTimesS`, in the accent
   colour, positioned `t / windowLength * width`.

Not interactive. No handles, no crop shading, no position line. It shows one
thing: where the app thinks the combustions were.

Colours come from the CSS variables through the same read-once-per-scheme
pattern as `WaveformCanvas`, so light and dark both work and no frame pays for
`getComputedStyle`.

## 4. Failure

The message takes the number's place, in the error colour, at ordinary text
size rather than display size: it is a sentence, not a figure. The waveform is
not drawn, since there is nothing to mark. Everything above stays live.

## 5. Scrolling into view

When the status becomes `done` or `failed`, the result element is scrolled into
view with `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.
`nearest` rather than `center` so a screen tall enough to show everything does
not scroll at all.

## 6. Tests

- `resultWaveform.test.ts` — the pure part: `tickX(timeS, windowS, width)`, and
  that a tick lands within a pixel of where the pulse is in the window. The
  canvas drawing itself is not unit tested; that is what the Playwright pass is
  for.
- `analysis.fixtures.test.ts` gains an assertion that the mark count is within
  5 % of `pulsesPerS * durationS` for every fixture, which is AC 1 without a
  browser.

## 7. Out

No animation on the number. No sharing. No saving. No confidence figure. The
tachometer gauge stays in the backlog where phase 1 put it.
