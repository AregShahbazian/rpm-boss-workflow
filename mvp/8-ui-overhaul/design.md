---
id: rb-ui-overhaul
feature: 8-ui-overhaul
branch: feat/8-ui-overhaul
status: draft
created: 2026-09-10
---

# Design — UI overhaul

## 0. Two acceptance criteria that cannot hold as written

### 0.1 "No preference" is not something a browser reports

AC 6 asks for the dark theme when the operating system expresses no colour
preference. `prefers-color-scheme: no-preference` was removed from the spec.
Every current browser answers `light` when nothing is set, so "no preference"
and "prefers light" are the same query result and cannot be told apart.

**AC 6 is amended.** The theme setting has three values and its factory value
is `dark`, not `system`. The app is dark until someone says otherwise, which is
what "dark theme default" asked for, and `system` is there for people who want
their phone to decide. A stored choice beats everything, in both directions,
and survives a reload.

### 0.2 The way back out of the zoomed view is not a handle drag

The PRD says an outward drag on a crop handle zooms back out. It cannot: the
window is capped at `MAX_WINDOW_S` by `setStart` and `setEnd`, so once it is
ten seconds long, dragging a handle outward is clamped and nothing moves.

**AC 9a is amended,** to a simpler rule that needs no new gesture:

> The zoomed view lasts exactly as long as the result does. Touching the
> waveform ends it.

The snap is released on `pointerdown`, before the drag moves anything, so the
view widens once and then the drag happens in the wide view. Releasing it on
the selection change instead would widen the view mid-drag and pull the
waveform out from under the finger.

## 1. The breakpoint is a media query, and the layout is one grid

`.screen` becomes a CSS grid with named areas and no JavaScript. One DOM order
serves both layouts, which keeps the reading order for a screen reader equal to
the stacked visual order.

```
source · status · wave · transport · range · calc · result      (DOM order)
```

Stacked below 600 px, one column in that order.

Split at 600 px and up **and in landscape**. Width alone was the original
rule, and testing killed it: a 1137 by 1707 portrait tablet is wide enough to
split, and splitting it collapsed the whole app into a 289 px band across the
middle of the screen with 693 px of nothing above and below. A waveform gains
almost nothing from height and everything from width, so a tall screen keeps
the stacked column, widened past its 480 px cap so it is not a ribbon either.
The two queries use `orientation` rather than a pair of aspect-ratio bounds,
because `min-aspect-ratio: 1/1` and `max-aspect-ratio: 1/1` both match a square
viewport and the blocks would fight over it.

```
grid-template-columns: minmax(0, var(--col)) minmax(0, 1fr);
grid-template-areas:
  "source wave"
  "status wave"
  "result wave"
  "range  wave"
  "calc   transport";
```

`wave` spans four rows of the second column, so it takes whatever the control
column does not need, and `transport` lines up with Calculate. Every area is
rectangular, which grid requires.

Three consequences worth stating.

- **Right-to-left is free.** Grid columns follow the inline direction, so
  `dir="rtl"` on the root puts the control column on the right with no second
  set of rules. Only spacing needs care, and that means logical properties
  (`margin-inline`, `padding-inline`) throughout.
- **The leftover height goes to the waveform.** The result row is `1fr`, and
  because the wave spans rows one to four its height follows. Content-sized
  rows centred with `align-content` were tried first and left 60 % of a tablet
  empty with the waveform a 185 px strip. `.wave-detail` carries a
  `max-block-size` so it cannot grow without limit; the control column spreads
  out with it, buttons at the top, Calculate at the bottom.
- **`--col` is a clamp**, `clamp(300px, 34vw, 460px)`. The floor is what the
  source row needs on one line: wrapping it costs 52 px of height, and a
  landscape phone has 360 px in total. The ceiling keeps the waveform above
  500 px on an 844 px screen while letting the column grow on a tablet.

## 2. The waveform measures itself, and the block owns the number

`WaveformCanvas` currently owns a `ResizeObserver` and takes its height as a
prop. That is backwards for this phase: `WaveformBlock` needs the width to
decide the detail span, and the height now comes from the grid rather than from
a constant.

- New `src/ui/useElementSize.ts`: a `ResizeObserver` hook returning
  `{ width, height }` for a ref.
- `WaveformBlock` measures each canvas wrapper and passes `width` and `height`
  down. `WaveformCanvas` keeps the pointer handling and the drawing and loses
  the observer and the `height` prop.
- The wrappers get their size from CSS: the overview a fixed
  `block-size: 48px`, the detail `block-size: clamp(150px, 26dvh, 232px)` when
  stacked and `block-size: 100%` with `max-block-size: 560px` when split.

## 3. `LONG_CLIP_S` becomes a function of the measured width

`waveform/range.ts`:

```ts
export const MIN_PX_PER_S = 25
export const detailSpanS = (width: number) =>
  width > 0 ? Math.max(MAX_WINDOW_S, width / MIN_PX_PER_S) : Infinity
```

This started at `12 px/s`, which reproduced the old 30 s at the 360 px canvas
the constant assumed. That turned out to be the wrong number once the waveform
got wider: 63 seconds on screen at once is a great deal of context for placing
a ten second window, it makes the handles hard to land, and it left almost no
recording long enough to zoom out of. At 25 a ten second window is 250 px wide
wherever it is drawn. The floor at
`MAX_WINDOW_S` stops the detail view from being narrower than a full window on
a very small canvas. `Infinity` before the first measurement means no overview
strip and no flash of one.

`nextDetailRange` takes the span as a parameter instead of reading the
constant. The overview strip shows when `durationS > spanS`.

## 4. One waveform: the marks move onto the detail canvas

`ResultWaveform.tsx` is deleted. Its reason for existing was that a 10 s window
inside a 30 s detail view smears the marks, and the snap removes that reason.

- `WaveformBlock` gains an optional `marks` prop: the pulse times, and the
  window they were measured in.
- When `marks` arrives, the detail range is set to exactly that window. While
  it holds, the canvas draws the window edge to edge and the marks land at the
  spacing they were found at.
- `pointerdown` anywhere in the block clears the snap, and the range returns to
  the width-derived logic on the next render.
- `tick.ts` gains `tickPositionsInRange(timesS, offsetS, range, width)`: pulse
  times are relative to the analysed window, so they are offset by the window
  start before being mapped through the visible range. `tickX` stays as it is
  and both stay pure and tested.
- The marks are drawn in the same overlay pass as the selection, after the
  raster and before the handles, so a handle is never hidden by a mark.

`ResultView` keeps the number, the unit, the count and the octave note, and
loses the waveform. It is now purely the answer.

## 5. Theme

`src/ui/theme.ts`, no context and no provider: a `useTheme` hook over
`localStorage` plus `document.documentElement.dataset.theme`.

```ts
export type Theme = 'system' | 'light' | 'dark'
```

- Stored under `rpm-boss.theme`. Absent means `dark`.
- The hook writes `data-theme` on `<html>` for `light` and `dark`, and removes
  the attribute for `system`.
- It also writes `color-scheme` so native controls, scrollbars and the file
  picker match.

`index.css` inverts. The bare `:root` becomes the **dark** token set, because
dark is the default and an unstamped document must be dark:

```css
:root { /* dark tokens */ color-scheme: dark; }
@media (prefers-color-scheme: light) {
  :root[data-theme='system'] { /* light tokens */ color-scheme: light; }
}
:root[data-theme='light'] { /* light tokens */ color-scheme: light; }
```

`system` is stamped as an attribute rather than left unstamped, so the media
query can be scoped to it and the default stays dark without a query at all.

Two values are not a plain inversion and get their own light-theme numbers:

- the selection dim, `--dim`, 0.6 over a dark ground reads far weaker over a
  light one, so light gets 0.72;
- `--error`, which is a pale pink on dark and has to be a true red on white.

`usePalette` already re-reads the variables when the scheme changes; it now
watches the `data-theme` attribute as well, with a `MutationObserver` on
`documentElement`, so the canvases repaint when the setting changes rather than
only when the OS does.

## 6. Settings

A native `<dialog>` opened with `showModal()`. No library: it brings its own
focus trap, its own backdrop, and Escape to close.

- Trigger: one 48 px icon button at the end of the source row, beside the
  sample picker's, which took the same shape for the same reason. "Out of the
  flow" in the PRD means it stops being a labelled `<select>` sitting between
  the buttons and the status line, not that it leaves the screen; there is
  nowhere else on a phone for it to go.
- Contents: the language `<select>` that `LanguagePicker` already renders, and
  a three-way radio group for the theme. Radios rather than a toggle, because
  the third state is a real state and a two-way toggle cannot express it.
- `LanguagePicker.tsx` keeps its native `<select>` and loses the row wrapper.

Five new message keys: `settings`, `theme`, `themeSystem`, `themeLight`,
`themeDark`. `dismiss` is reused for the close button; in most of the bundles
it already reads as "close".

## 7. Bidi

Two changes, both small.

- `I18nProvider` sets `document.documentElement.dir` from the language's `rtl`
  flag, beside the `lang` it already sets.
- `t()` wraps interpolated values in `U+2068 FSI` and `U+2069 PDI` **when the
  current language is right to left**. That is what keeps a Latin file name or
  a duration from being reordered inside an Urdu sentence, and it fixes every
  message with a placeholder at once rather than one at a time. Left-to-right
  languages get the plain string, so no existing test output changes.

Digits that are not inside a sentence — the rpm figure, the clock readouts, the
crop bounds — get `dir="ltr"` on their own element. The waveform is a canvas
and is unaffected by direction.

## 8. What is deliberately not done

- No animation on the layout change. A rotation already re-lays out the page.
- No settings beyond the two. No units, no engine presets, no about box.
- `MIN_PX_PER_S` is not exposed in settings. It is a legibility floor, not a
  preference.
- The stacked layout keeps `max-inline-size: 480px` and stays centred. Nothing
  about it changes except the merged waveform, the 8 px inset and the settings
  button.

## 9. Files

| file | change |
|---|---|
| `src/index.css` | dark-first tokens, the grid, logical properties |
| `src/ui/useElementSize.ts` | new |
| `src/ui/theme.ts` | new |
| `src/ui/Settings.tsx` | new |
| `src/ui/WaveformCanvas.tsx` | loses the observer and `height`, draws marks |
| `src/ui/WaveformBlock.tsx` | measures, owns the span and the snap |
| `src/ui/ResultWaveform.tsx` | deleted |
| `src/ui/ResultView.tsx` | number only |
| `src/ui/InputScreen.tsx` | grid areas, passes marks down, settings button |
| `src/ui/LanguagePicker.tsx` | select only |
| `src/ui/palette.ts` | watches `data-theme` too |
| `src/ui/tick.ts` | `tickPositionsInRange` |
| `src/waveform/range.ts` | `detailSpanS`, span parameter, no `LONG_CLIP_S` |
| `src/i18n/index.ts` | `dir`, bidi isolation |
| `src/i18n/en.ts` + 16 bundles | five keys |
| `test/range.test.ts`, `test/tick.test.ts` | follow the signatures |
| `test/theme.test.ts` | new |


## 10. Amended after implementation

Three things in this document were wrong when it was written and are recorded
here rather than quietly edited away.

- **Width alone does not decide the split.** It needs a landscape shape too;
  see section 1. The claim that one width rule covered tablet portrait was
  disproved the first time a portrait tablet was looked at.
- **The block does not centre; it fills.** Section 1 originally said the tablet
  cap was `align-content: center`. That left most of a tablet empty.
- **The sample picker.** It arrived on `main` while this phase was in
  implementation and was not in the design. It is a third way to load audio,
  so it sits beside Open and Record as an icon opening a sheet, on the same
  reasoning as the settings: the source row sets the control column's width,
  and nothing that unfolds inline belongs in it. It is off in a release build.
